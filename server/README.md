# Nhà Xinh Policy API

Spring Boot 3 / Java 17 API that stores the customer-facing purchase and return
policies in MySQL. The public page reads the saved content from the API. Admin
updates are persisted in MySQL and are returned to visitors on their next page
load; no browser-local storage is used.

## Requirements

- Java 17+
- Maven 3.9+
- MySQL 8+

The API runs Flyway migrations at startup. `DB_URL` may be set to point at a
different MySQL host/database. The database user must be allowed to create the
database and application tables.

The active Flyway baseline creates the `users` and `policy_pages` tables needed
by the current API. The broader furniture-store schema is documented in
[docs/data-architecture.md](docs/data-architecture.md), but its original V2
migration is unavailable. The commented V3 draft is kept as a disabled file
and is not applied at startup.

On Windows, start the installed MySQL service (for example, `MySQL80`) from
Services before launching the API.

## Run locally (PowerShell)

Set credentials in the shell that will launch the server. Do not commit these
values to source control:

```powershell
$env:DB_URL = "jdbc:mysql://localhost:3306/nhaxinh"
$env:DB_USER = "your-mysql-user"
$env:DB_PASS = "your-mysql-password"
$env:ADMIN_USERNAME = "your-admin-user"
$env:ADMIN_PASSWORD = "use-a-unique-password-at-least-12-characters"
$env:CORS_ALLOWED_ORIGINS = "http://localhost:5173"
.\mvnw.cmd spring-boot:run
```

The backend seeds the initial admin account once, using BCrypt to hash the
password. Changing the environment password does not overwrite an existing
database account. Admin accounts can be rotated by updating the account in the
database or removing its row and restarting with the intended bootstrap
credentials.

In a second terminal, run the frontend from `client/` with `npm run dev`. Vite
proxies `/api` to `http://localhost:8080`.

## Endpoints

- `GET /api/v1/policies` — public policy content
- `GET /api/v1/auth/csrf` — obtain the CSRF token before a state-changing request
- `GET /api/v1/auth/me` — current admin session state
- `POST /api/v1/auth/login` — create an admin session
- `POST /api/v1/auth/logout` — end the current admin session
- `PUT /api/v1/policies` — update content; requires an authenticated admin and
  the CSRF token in `X-XSRF-TOKEN`
- `GET /api/v1/admin/categories?includeInactive=true` — list categories for
  administration; inactive categories are excluded by default.
- `POST /api/v1/admin/categories` and `PUT /api/v1/admin/categories/{id}` —
  create/update a category; `PATCH /api/v1/admin/categories/{id}/status`
  activates or deactivates it.
- `GET /api/v1/admin/products?includeArchived=true` — list products for
  administration; archived products are excluded by default.
- `POST /api/v1/admin/products` and `PUT /api/v1/admin/products/{id}` — create
  or update a product, variants, media, and optional initial variant stock.
  `PATCH /api/v1/admin/products/{id}/status` changes its `DRAFT`, `ACTIVE`, or
  `ARCHIVED` status. These admin endpoints require ADMIN.

The public `POST /api/v1/products` endpoint also supports product creation for
ADMIN or STAFF integrations.

Product creation accepts either `application/json` (external media URLs only)
or `multipart/form-data` (URLs and uploaded files). For multipart requests,
send the JSON document as the `request` part and upload files as repeated
`mediaFiles` parts. A media item's `fileIndex` points to the zero-based position
of its file in that repeated part list; use `mediaUrl` instead for an existing
HTTP(S) URL. Image uploads support JPEG, PNG, GIF, and WebP up to 10 MiB each.
3D uploads support binary glTF (`.glb`) up to 100 MiB each. Uploaded files are
available from `/media/products/{generated-file-name}` and stored under
`MEDIA_STORAGE_DIR` (default: `uploads/products`); production should map this
directory to persistent storage or a shared volume.

Example multipart JSON `request` part:

```json
{
  "name": "Ghế sofa",
  "slug": "ghe-sofa",
  "status": "DRAFT",
  "categoryIds": [1],
  "variants": [{
    "sku": "SOFA-001",
    "name": "Mặc định",
    "price": 12500000,
    "initialStock": 5
  }],
  "media": [
    { "mediaType": "IMAGE", "fileIndex": 0, "altText": "Ảnh sofa", "isPrimary": true },
    { "mediaType": "MODEL_3D", "fileIndex": 1, "altText": "Mô hình 3D sofa" }
  ]
}
```

`initialStock` is saved in the current `inventory` table per variant. The
current data model does not yet support selecting a warehouse during product
creation.

### Cart, checkout, and payments

- `POST /api/v1/cart/session` — create an anonymous cart token. Keep the
  returned `cartToken` private and send it as `X-Cart-Token`.
- `GET /api/v1/cart`, `POST /api/v1/cart/items`,
  `PATCH /api/v1/cart/items/{itemId}`, `DELETE /api/v1/cart/items/{itemId}` —
  manage a cart; signed-in users use their account cart.
- `POST /api/v1/checkout` — create an order and pending payment from the active
  cart. The server calculates prices from catalog records, verifies and
  reserves inventory, and records the initial payment transaction.
- `GET /api/v1/payments/order/{orderCode}` — retrieve payment details. Guest
  requests must include the order's recipient `phone` query parameter; signed-in
  requests are scoped to the account.
- `POST /api/v1/payments/order/{orderCode}/retry` — create a new pending
  transaction for a failed payment after checking and reserving stock again.
- `GET /api/v1/admin/payments`, `GET /api/v1/admin/payments/{id}`,
  `PUT /api/v1/admin/payments/{id}/status`, and
  `DELETE /api/v1/admin/payments/{id}` — admin payment management. Delete is a
  soft cancellation: payment rows are retained for audit. VNPAY payments can
  only be marked paid by a valid provider callback.

Checkout supports `CASH_ON_DELIVERY`, `BANK_TRANSFER`, and `VNPAY`. COD and
manual transfer are created as `PENDING`; staff confirms them from the admin
payment API. VNPAY returns a signed payment URL and updates the order only from
the signed IPN callback; the browser return URL is informational and does not
mark an order paid. Configure `VNPAY_TMN_CODE`, `VNPAY_HASH_SECRET`,
`VNPAY_PAYMENT_URL`, `VNPAY_RETURN_URL`, `VNPAY_IPN_URL`, and
`FRONTEND_PAYMENT_RESULT_URL` in the deployment environment. The default
payment URL is the VNPAY sandbox. Do not put credentials in source control.

Guest orders require nullable `orders.user_id`. This project does not currently
run Flyway migrations, so apply [allow-guest-checkout.sql](./docs/sql/allow-guest-checkout.sql)
to the existing MySQL database before deploying this change. Checkout, payment
status transitions, and inventory movements are written to `audit_logs` and
`inventory_movements`; VNPAY callback receipts are retained in
`payment_webhook_events`.

Production should expose the frontend and API on the same origin behind a
reverse proxy, configure `CORS_ALLOWED_ORIGINS`, and set
`SESSION_COOKIE_SECURE=true` when using HTTPS. Admin authentication currently
uses username/password and an HTTP-only session cookie; the API can later add
an OIDC provider without changing the policy content API.
