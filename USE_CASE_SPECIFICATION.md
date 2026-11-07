# BẢN ĐẶC TẢ VÀ SƠ ĐỒ USE CASE DỰ ÁN NHÀ XINH (CHUẨN STARUML)

> **Mô hình**: Use Case Diagram chuẩn StarUML  
> **Dự án**: Website Thương mại Điện tử Nội thất Nhà Xinh  
> **File thiết kế StarUML / PlantUML đính kèm**

---

## 1. Sơ đồ Use Case Trực quan (Chuẩn StarUML Grid)

![Sơ đồ Use Case StarUML](C:/Users/trung/.gemini/antigravity/brain/7d4740ce-9b8d-41ed-91dc-7e08f2d6278f/usecase_staruml.svg)

---

## 2. Mã nguồn PlantUML (Dùng để Import / Paste trực tiếp vào StarUML)

> [!TIP]
> Bạn có thể copy đoạn mã dưới đây dán trực tiếp vào **StarUML** (thông qua menu `Tools` -> `PlantUML` hoặc plugin StarUML PlantUML) hoặc dùng trên [PlantText / PlantUML Online](https://www.planttext.com/):

```plantuml
@startuml
left to right direction
skinparam packageStyle rectangle
skinparam actorStyle awesome
skinparam backgroundColor #ffffff
skinparam shadowing false
skinparam defaultFontName "Segoe UI"
skinparam defaultFontSize 12

actor "Khách xem" as Guest
actor "Khách hàng" as Customer
actor "Dịch vụ email" as EmailService
actor "Nhân viên" as Staff
actor "Quản lý" as Manager

' Quan hệ kế thừa (Generalization)
Customer -up-|> Guest
Manager -up-|> Staff

' Khách xem
usecase "Gửi yêu cầu tư vấn" as UC_Consult
usecase "Đặt hàng và thanh toán" as UC_Checkout
usecase "Xem bài viết" as UC_Articles
usecase "Quản lý giỏ hàng" as UC_Cart
usecase "Xem chi tiết sản phẩm" as UC_Detail
usecase "Đăng ký" as UC_Register
usecase "Tìm kiếm sản phẩm" as UC_Search

' Khách hàng
usecase "Xem danh sách đơn hàng" as UC_OrderList
usecase "Quản lý thông tin cá nhân" as UC_Profile

' Xác thực
usecase "Đăng nhập" as UC_Login
usecase "Quên mật khẩu" as UC_ForgotPassword

' Nhân viên
usecase "Quản lý đơn hàng" as UC_ManageOrders
usecase "Quản lý sản phẩm" as UC_ManageProducts
usecase "Quản lý bài viết" as UC_ManageArticles
usecase "Quản lý danh mục" as UC_ManageCategories

' Quản lý
usecase "Quản lý thông tin website" as UC_ManageWebsite
usecase "Quản lý quyền và phân quyền" as UC_ManageRBAC
usecase "Quản lý tài khoản" as UC_ManageAccounts

' Kết nối Khách xem
Guest -- UC_Consult
Guest -- UC_Checkout
Guest -- UC_Articles
Guest -- UC_Cart
Guest -- UC_Detail
Guest -- UC_Register
Guest -- UC_Search

' Kết nối Khách hàng
Customer -- UC_OrderList
Customer -- UC_Profile
Customer -- UC_Login

' Mở rộng Quên mật khẩu & Dịch vụ email
UC_ForgotPassword ..> UC_Login : <<extend>>
EmailService -- UC_ForgotPassword

' Kết nối Nhân viên
Staff -- UC_ManageOrders
Staff -- UC_ManageProducts
Staff -- UC_ManageArticles
Staff -- UC_ManageCategories
Staff -- UC_Login

' Kết nối Quản lý
Manager -- UC_ManageWebsite
Manager -- UC_ManageRBAC
Manager -- UC_ManageAccounts
@enduml
```

---

## 3. Sơ đồ Mermaid (Hiển thị trực tiếp trong Markdown)

```mermaid
flowchart LR
    classDef actor fill:#ffffff,stroke:#333333,stroke-width:1.5px,color:#111111,font-weight:bold;
    classDef usecase fill:#ffffff,stroke:#333333,stroke-width:1.2px,color:#222222;

    %% ── Actors Bên Trái ──
    Guest["Khách xem"]:::actor
    Customer["Khách hàng"]:::actor
    EmailService["Dịch vụ email"]:::actor

    Customer -- "kế thừa" --> Guest

    %% ── Use Cases ──
    subgraph System ["Hệ Thống Nhà Xinh"]
        direction TB
        UC_Consult(["Gửi yêu cầu tư vấn"]):::usecase
        UC_Checkout(["Đặt hàng và thanh toán"]):::usecase
        UC_Articles(["Xem bài viết"]):::usecase
        UC_Cart(["Quản lý giỏ hàng"]):::usecase
        UC_Detail(["Xem chi tiết sản phẩm"]):::usecase
        UC_Register(["Đăng ký"]):::usecase
        UC_Search(["Tìm kiếm sản phẩm"]):::usecase

        UC_OrderList(["Xem danh sách đơn hàng"]):::usecase
        UC_Profile(["Quản lý thông tin cá nhân"]):::usecase

        UC_Login(["Đăng nhập"]):::usecase
        UC_ForgotPassword(["Quên mật khẩu"]):::usecase

        UC_ManageOrders(["Quản lý đơn hàng"]):::usecase
        UC_ManageProducts(["Quản lý sản phẩm"]):::usecase
        UC_ManageArticles(["Quản lý bài viết"]):::usecase
        UC_ManageCategories(["Quản lý danh mục"]):::usecase

        UC_ManageWebsite(["Quản lý thông tin website"]):::usecase
        UC_ManageRBAC(["Quản lý quyền và phân quyền"]):::usecase
        UC_ManageAccounts(["Quản lý tài khoản"]):::usecase
    end

    %% ── Actors Bên Phải ──
    Staff["Nhân viên"]:::actor
    Manager["Quản lý"]:::actor

    Manager -- "kế thừa" --> Staff

    %% Kết nối Khách xem
    Guest --- UC_Consult
    Guest --- UC_Checkout
    Guest --- UC_Articles
    Guest --- UC_Cart
    Guest --- UC_Detail
    Guest --- UC_Register
    Guest --- UC_Search

    %% Kết nối Khách hàng
    Customer --- UC_OrderList
    Customer --- UC_Profile
    Customer --- UC_Login

    %% Quan hệ Quên mật khẩu & Dịch vụ email
    UC_ForgotPassword -. "«extend»" .-> UC_Login
    EmailService --- UC_ForgotPassword

    %% Kết nối Nhân viên
    Staff --- UC_ManageOrders
    Staff --- UC_ManageProducts
    Staff --- UC_ManageArticles
    Staff --- UC_ManageCategories
    Staff --- UC_Login

    %% Kết nối Quản lý
    Manager --- UC_ManageWebsite
    Manager --- UC_ManageRBAC
    Manager --- UC_ManageAccounts

    style System fill:#fafaf9,stroke:#e2e2e2,stroke-width:1px;
```

---

## 4. Bảng Thống kê Tác nhân và Use Case

| Nhóm | Tác nhân (Actor) | Quan hệ kế thừa | Danh sách Use Case trực tiếp |
| :--- | :--- | :--- | :--- |
| **Khách vãng lai** | `Khách xem` | Không | 1. Gửi yêu cầu tư vấn<br>2. Đặt hàng và thanh toán<br>3. Xem bài viết<br>4. Quản lý giỏ hàng<br>5. Xem chi tiết sản phẩm<br>6. Đăng ký<br>7. Tìm kiếm sản phẩm |
| **Khách hàng** | `Khách hàng` | Kế thừa từ **Khách xem** | 8. Xem danh sách đơn hàng<br>9. Quản lý thông tin cá nhân<br>10. Đăng nhập |
| **Hệ thống ngoài** | `Dịch vụ email` | Không | Gửi email liên kết xác thực đặt lại mật khẩu trong Use Case **Quên mật khẩu** |
| **Nhân viên** | `Nhân viên` | Không | 11. Quản lý đơn hàng<br>12. Quản lý sản phẩm<br>13. Quản lý bài viết<br>14. Quản lý danh mục<br>15. Đăng nhập |
| **Quản trị / Quản lý**| `Quản lý` | Kế thừa từ **Nhân viên** | 16. Quản lý thông tin website<br>17. Quản lý quyền và phân quyền<br>18. Quản lý tài khoản |

### Mối quan hệ đặc biệt (Relationships)
- **Generalization (Kế thừa)**:
  - `Khách hàng` ➔ `Khách xem`: Khách hàng sau khi đăng nhập sở hữu toàn bộ chức năng của khách xem + chức năng riêng của tài khoản.
  - `Quản lý` ➔ `Nhân viên`: Quản lý sở hữu toàn bộ chức năng quản lý nghiệp vụ bán hàng + các chức năng hệ thống cấp cao.
- **Extend (Mở rộng)**:
  - `Quên mật khẩu` **«extend»** `Đăng nhập`: Khi người dùng không nhớ mật khẩu tại màn hình đăng nhập, use case quên mật khẩu sẽ mở rộng luồng xử lý để gửi email lấy lại mật khẩu thông qua `Dịch vụ email`.
