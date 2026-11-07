# BỘ TÀI LIỆU TEST CASE CHI TIẾT DỰ ÁN NỘI THẤT NHÀ XINH

> **Hệ thống:** Thương mại điện tử Nội thất Nhà Xinh (React SPA + Spring Boot REST API + MySQL + VNPay Gateway)  
> **Phiên bản tài liệu:** 1.0  
> **Phạm vi kiểm thử:** Đăng nhập, Quên mật khẩu, Thanh toán VNPay, Thêm mới sản phẩm, Cập nhật sản phẩm, Xóa sản phẩm.  
> **Tiêu chuẩn kiểm thử:** IEEE 829 / ISTQB Standard QA/QC Matrix.

---

## I. MA TRẬN PHÂN QUYỀN TRUY CẬP (RBAC MATRIX)

| Chức năng | Khách xem (Guest) | Khách hàng (Customer) | Nhân viên (Staff) | Quản trị viên (Admin) |
| :--- | :---: | :---: | :---: | :---: |
| **Đăng nhập** | Có thể thao tác | Đã đăng nhập | Có thể thao tác | Có thể thao tác |
| **Quên mật khẩu** | Có thể thao tác | Có thể thao tác | Có thể thao tác | Có thể thao tác |
| **Thanh toán VNPay** | Được phép (Guest) | Được phép (User) | Được phép mua hàng | Được phép mua hàng |
| **Xem sản phẩm** | Cho phép | Cho phép | Cho phép | Cho phép |
| **Thêm mới sản phẩm** | ❌ Chặn (403) | ❌ Chặn (403) | Cần quyền `products.create` | ✅ Toàn quyền |
| **Cập nhật sản phẩm** | ❌ Chặn (403) | ❌ Chặn (403) | Cần quyền `products.edit` | ✅ Toàn quyền |
| **Xóa sản phẩm** | ❌ Chặn (403) | ❌ Chặn (403) | Cần quyền `products.delete` | ✅ Toàn quyền |

---

## II. BỘ TEST CASE CHỨC NĂNG: ĐĂNG NHẬP (LOGIN)

### 1. Phân quyền & Điều kiện tiên quyết
* **URL:** `/dang-nhap` hoặc modal đăng nhập.
* **Tài khoản kiểm thử sẵn có:**
  * `doanvanhuan` / `Password123@` (Khách hàng bình thường)
  * `staff01` / `Password123@` (Nhân viên - Role STAFF)
  * `admin` / `Password123@` (Quản trị viên - Role ADMIN)
  * `locked_user` / `Password123@` (Tài khoản bị khóa `status = LOCKED`)

---

### 2. Danh sách Test Case Đăng Nhập

| Test Case ID | Tên kịch bản | Phân loại | Tiền điều kiện | Các bước thực hiện | Dữ liệu đầu vào (Test Data) | Kết quả mong đợi | Mức độ ưu tiên |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **TC_LOGIN_01** | Đăng nhập thành công bằng Tên đăng nhập (Username) | Positive | Người dùng ở trang `/dang-nhap` | 1. Nhập username hợp lệ.<br>2. Nhập mật khẩu hợp lệ.<br>3. Bấm nút "Đăng nhập". | `username`: "doanvanhuan"<br>`password`: "Password123@" | - API `POST /api/v1/auth/login` trả về `200 OK`.<br>- Lưu session cookie & `nhaxinh_user`.<br>- Tự động nạp giỏ hàng của `doanvanhuan` từ MySQL.<br>- Chuyển hướng về `/tai-khoan` hoặc trang trước đó. | **Critical** |
| **TC_LOGIN_02** | Đăng nhập thành công bằng Email | Positive | Tài khoản đã liên kết email trong hệ thống | 1. Nhập email đã đăng ký.<br>2. Nhập mật khẩu đúng.<br>3. Bấm "Đăng nhập". | `username/email`: "huan@example.com"<br>`password`: "Password123@" | - Đăng nhập thành công.<br>- Hiển thị thông báo chào mừng đúng tên khách hàng. | **High** |
| **TC_LOGIN_03** | Đăng nhập thành công bằng Số điện thoại | Positive | Tài khoản đã đăng ký số điện thoại | 1. Nhập SĐT.<br>2. Nhập mật khẩu.<br>3. Bấm "Đăng nhập". | `phone`: "0987654321"<br>`password`: "Password123@" | - Đăng nhập thành công, nhận diện đúng tài khoản. | **Medium** |
| **TC_LOGIN_04** | Đăng nhập tài khoản Quản trị viên (Admin) | Permission | Tài khoản có quyền `ROLE_ADMIN` | 1. Nhập thông tin Admin.<br>2. Bấm "Đăng nhập". | `username`: "admin"<br>`password`: "Password123@" | - Đăng nhập thành công.<br>- Giao diện hiển thị nút điều hướng vào `/admin` (Admin Portal). | **Critical** |
| **TC_LOGIN_05** | Đăng nhập tài khoản Nhân viên (Staff) | Permission | Tài khoản có quyền `ROLE_STAFF` | 1. Nhập thông tin Staff.<br>2. Bấm "Đăng nhập". | `username`: "staff01"<br>`password`: "Password123@" | - Đăng nhập thành công.<br>- Quyền hạn được nạp tương ứng vai trò Staff (chỉ truy cập các tab được phân quyền). | **High** |
| **TC_LOGIN_06** | Đăng nhập thất bại do sai Mật khẩu | Negative | Tài khoản tồn tại trên hệ thống | 1. Nhập username đúng.<br>2. Nhập mật khẩu sai.<br>3. Bấm "Đăng nhập". | `username`: "doanvanhuan"<br>`password`: "WrongPass999!" | - API trả về lỗi `401 Unauthorized`.<br>- Báo lỗi thân thiện: *"Tên đăng nhập hoặc mật khẩu không chính xác"*. Không lộ chi tiết mật khẩu sai.<br>- Ghi audit log `LOGIN_FAILED`. | **Critical** |
| **TC_LOGIN_07** | Đăng nhập thất bại do Tên tài khoản không tồn tại | Negative | Tài khoản chưa từng đăng ký | 1. Nhập username ngẫu nhiên.<br>2. Nhập mật khẩu bất kỳ.<br>3. Bấm "Đăng nhập". | `username`: "non_existent_user_999"<br>`password`: "SomePass123@" | - API trả về `401 Unauthorized`.<br>- Hiển thị cùng thông điệp chung: *"Tên đăng nhập hoặc mật khẩu không chính xác"*. | **High** |
| **TC_LOGIN_08** | Để trống Tên đăng nhập hoặc Mật khẩu | Validation | Người dùng ở trang đăng nhập | 1. Để trống username hoặc password.<br>2. Bấm "Đăng nhập". | `username`: ""<br>`password`: "" | - Form validate ngay tại Client, chặn submit.<br>- Hiển thị cảnh báo: *"Vui lòng nhập tên đăng nhập / email / SĐT và mật khẩu"*. | **Medium** |
| **TC_LOGIN_09** | Đăng nhập vào Tài khoản bị Khóa (LOCKED/INACTIVE) | Negative / Security | Tài khoản có `status = "LOCKED"` | 1. Nhập đúng username và password của tài khoản bị khóa.<br>2. Bấm "Đăng nhập". | `username`: "locked_user"<br>`password`: "Password123@" | - API trả về `403 Forbidden` (`AUTH_ACCOUNT_LOCKED`).<br>- Thông báo: *"Tài khoản của bạn tạm thời bị khóa. Vui lòng liên hệ quản trị viên."* | **High** |
| **TC_LOGIN_10** | Chức năng "Ghi nhớ đăng nhập" (Remember Me) | Functional | Người dùng ở trang đăng nhập | 1. Nhập thông tin hợp lệ.<br>2. Tích chọn "Ghi nhớ đăng nhập".<br>3. Đăng nhập và đóng trình duyệt, sau đó mở lại. | Checkbox Remember Me: `true` | - Phiên đăng nhập được duy trì (token expiration = 24h+).<br>- Người dùng mở lại trang vẫn ở trạng thái đã đăng nhập. | **Medium** |
| **TC_LOGIN_11** | Chống Brute Force (Đăng nhập sai liên tiếp) | Security | Hệ thống bật cơ chế bảo vệ | 1. Nhập sai mật khẩu liên tục 5 lần liên tiếp. | `password`: 5 lần sai | - Hệ thống kích hoạt cooldown hoặc cảnh báo bảo mật.<br>- Tất cả các lượt đăng nhập sai đều được ghi vết vào bảng `audit_logs`. | **High** |

---

## III. BỘ TEST CASE CHỨC NĂNG: QUÊN MẬT KHẨU & ĐẶT LẠI MẬT KHẨU

### 1. Phân quyền & Điều kiện tiên quyết
* **URL:** `/dang-nhap` (Tab Quên mật khẩu).
* Dịch vụ gửi email (SMTP / Notification Service) đã được cấu hình.

---

### 2. Danh sách Test Case Quên Mật Khẩu

| Test Case ID | Tên kịch bản | Phân loại | Tiền điều kiện | Các bước thực hiện | Dữ liệu đầu vào (Test Data) | Kết quả mong đợi | Mức độ ưu tiên |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **TC_PWD_01** | Yêu cầu gửi mã xác nhận (OTP/Token) thành công | Positive | Email đã đăng ký tài khoản hợp lệ | 1. Chọn tab "Quên mật khẩu".<br>2. Nhập email hợp lệ.<br>3. Bấm "Gửi mã xác nhận". | `email`: "doanvanhuan@example.com" | - API trả về `200 OK`.<br>- Thông báo: *"Mã xác nhận đã được gửi đến email của bạn"*. Chuyển sang bước nhập OTP.<br>- Kiểm tra hộp thư nhận được email chứa mã OTP 6 số. | **Critical** |
| **TC_PWD_02** | Đặt lại mật khẩu mới thành công với đúng OTP | Positive | Đã nhận được mã OTP hợp lệ trong hòm thư | 1. Nhập đúng mã OTP vừa nhận.<br>2. Nhập mật khẩu mới hợp lệ.<br>3. Xác nhận mật khẩu mới.<br>4. Bấm "Đổi mật khẩu". | `otp`: "892145"<br>`newPassword`: "NewSecurePass123@"<br>`confirmPassword`: "NewSecurePass123@" | - API cập nhật mật khẩu mã hóa BCrypt vào DB.<br>- Báo đổi mật khẩu thành công.<br>- Đăng nhập lại bằng mật khẩu mới thành công. | **Critical** |
| **TC_PWD_03** | Gửi yêu cầu với Email chưa đăng ký | Negative | Email chưa tồn tại trong hệ sinh thái Nhà Xinh | 1. Nhập email không tồn tại.<br>2. Bấm "Gửi mã xác nhận". | `email`: "not_registered_email_999@gmail.com" | - Báo lỗi thân thiện: *"Email không tồn tại trong hệ thống"* hoặc thông điệp bảo mật tiêu chuẩn.<br>- Không tạo OTP giả mạo. | **High** |
| **TC_PWD_04** | Nhập sai định dạng Email | Validation | Ở tab quên mật khẩu | 1. Nhập email sai cấu trúc.<br>2. Bấm gửi. | `email`: "email_sai_dinh_dang@" hoặc "abc.com" | - Client báo lỗi định dạng: *"Email không đúng định dạng hợp lệ"*, nút bấm bị chặn. | **Medium** |
| **TC_PWD_05** | Nhập sai mã OTP | Negative | Đã yêu cầu mã OTP | 1. Nhập email đúng.<br>2. Nhập mã OTP sai.<br>3. Nhập mật khẩu mới.<br>4. Bấm "Đổi mật khẩu". | `otp`: "000000" (sai) | - Báo lỗi: *"Mã xác nhận không chính xác. Vui lòng kiểm tra lại hộp thư"*. Mật khẩu cũ không thay đổi. | **Critical** |
| **TC_PWD_06** | Nhập mã OTP đã hết hạn (Expired OTP) | Negative / Boundary | Mã OTP được sinh ra quá thời gian hiệu lực (ví dụ sau 10 phút) | 1. Chờ mã OTP hết hạn.<br>2. Nhập OTP cũ và bấm "Đổi mật khẩu". | `otp`: mã đã quá hạn | - Báo lỗi: *"Mã xác nhận đã hết hiệu lực. Vui lòng nhấn gửi lại mã mới"*. | **High** |
| **TC_PWD_07** | Mật khẩu xác nhận không trùng khớp | Validation | Đang ở bước đổi mật khẩu | 1. Nhập OTP đúng.<br>2. Nhập mật khẩu mới và xác nhận mật khẩu khác nhau. | `newPassword`: "PassA123@"<br>`confirmPassword`: "PassB456@" | - Client/Server chặn lại.<br>- Cảnh báo: *"Mật khẩu xác nhận không khớp"*. | **High** |
| **TC_PWD_08** | Mật khẩu mới không đáp ứng độ mạnh tối thiểu | Security | Đang ở bước đổi mật khẩu | 1. Nhập mật khẩu quá ngắn (< 6 ký tự) hoặc chỉ có số. | `newPassword`: "123" | - Báo lỗi: *"Mật khẩu phải có tối thiểu 6-8 ký tự, bao gồm chữ và số"*. | **Medium** |

---

## IV. BỘ TEST CASE CHỨC NĂNG: THANH TOÁN ĐƠN HÀNG QUA VNPAY

### 1. Phân quyền & Điều kiện tiên quyết
* **Vai trò:** Khách hàng đăng nhập hoặc Khách xem (Guest).
* Có ít nhất 1 sản phẩm hợp lệ trong giỏ hàng.
* Cổng thanh toán Sandbox VNPay đã sẵn sàng cấu hình (`vnp_TmnCode`, `vnp_HashSecret`, `vnp_Url`).

---

### 2. Danh sách Test Case Thanh Toán VNPay

| Test Case ID | Tên kịch bản | Phân loại | Tiền điều kiện | Các bước thực hiện | Dữ liệu đầu vào (Test Data) | Kết quả mong đợi | Mức độ ưu tiên |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **TC_VNPAY_01** | Khởi tạo đơn hàng & Chuyển hướng VNPay Gateway thành công | Positive | Giỏ hàng có sản phẩm, người dùng ở `/thanh-toan` | 1. Điền thông tin giao hàng hợp lệ.<br>2. Chọn phương thức "VNPAY".<br>3. Bấm "Đặt hàng ngay". | `paymentMethod`: "VNPAY"<br>`address`: "123 Lê Duẩn, Q1, HCM"<br>`phone`: "0901234567" | - API `POST /api/v1/checkout` trả về `paymentUrl` hợp lệ.<br>- Trình duyệt chuyển hướng mượt mà sang giao diện thanh toán chính thức của VNPay.<br>- Thông tin số tiền, mã đơn hàng hiển thị chính xác. | **Critical** |
| **TC_VNPAY_02** | Khách hàng thanh toán thành công trên cổng VNPay (ResponseCode = 00) | Positive | Đang ở giao diện VNPay Sandbox | 1. Chọn Ngân hàng NCB.<br>2. Nhập số thẻ test VNPay.<br>3. Nhập tên chủ thẻ và ngày phát hành.<br>4. Nhập OTP test "123456" và xác nhận. | - Số thẻ: `9704198526191432198`<br>- Tên: `NGUYEN VAN A`<br>- Ngày: `07/15`<br>- OTP: `123456` | - VNPay phản hồi mã `vnp_ResponseCode = "00"`.<br>- Server xử lý webhook/return URL: tạo đơn hàng `CONFIRMED`, thanh toán `PAID`.<br>- Giỏ hàng client được làm sạch.<br>- Điều hướng về trang `/payment/result` hiển thị mã đơn và trạng thái thành công. | **Critical** |
| **TC_VNPAY_03** | Khách hàng chủ động Hủy giao dịch trên VNPay (ResponseCode = 24) | Negative | Đang ở giao diện thanh toán VNPay | 1. Bấm nút "Hủy giao dịch" hoặc quay lại trang web. | `vnp_ResponseCode`: "24" | - Hệ thống nhận kết quả hủy bỏ.<br>- Đơn hàng không bị trừ tiền.<br>- Trang kết quả thông báo: *"Giao dịch đã bị hủy bởi người dùng"*, hiển thị nút cho phép thanh toán lại. | **High** |
| **TC_VNPAY_04** | Giao dịch thất bại do tài khoản không đủ số dư (ResponseCode = 51) | Negative | Sử dụng thẻ test mô phỏng không đủ tiền | 1. Nhập thông tin thẻ test thiếu số dư.<br>2. Xác nhận thanh toán. | Thẻ lỗi tài khoản không đủ số dư | - VNPay trả về mã `vnp_ResponseCode = "51"`.<br>- Hệ thống cập nhật trạng thái thanh toán `FAILED`.<br>- Thông báo lỗi rõ ràng cho khách hàng. | **High** |
| **TC_VNPAY_05** | Xác thực Chữ ký số an toàn (Checksum/Hash Security) | Security | Hacker can thiệp sửa đổi tham số URL callback | 1. Thay đổi giá trị `vnp_Amount` trên URL return mà không tính lại hash.<br>2. Gọi vào API return. | Sửa `vnp_Amount=100000000` | - Server tính toán lại HMAC-SHA512 checksum và so khớp thất bại.<br>- Từ chối ghi nhận giao dịch, báo lỗi chữ ký không hợp lệ, chống gian lận tài chính. | **Critical** |
| **TC_VNPAY_06** | Xử lý Idempotency khi Webhook/IPN gọi lặp lại nhiều lần | Edge Case | Đơn hàng đã thanh toán thành công | 1. Gửi lại request IPN thành công lần thứ 2 cho cùng 1 giao dịch. | Cùng mã giao dịch `vnp_TxnRef` | - Server phát hiện đơn hàng đã ghi nhận `PAID`.<br>- Trả về mã phản hồi `RspCode = "02" (Order already confirmed)`.<br>- Không trừ tồn kho lần 2, không tạo duplicate payment. | **High** |
| **TC_VNPAY_07** | Sản phẩm hết hàng trong lúc người dùng đang thực hiện thanh toán VNPay | Edge Case | Tồn kho sản phẩm = 1, có 2 người cùng thanh toán | 1. Khách A thanh toán trước, hàng hết.<br>2. Khách B hoàn tất thanh toán VNPay ngay sau đó. | Đơn hàng có sản phẩm tồn kho <= 0 | - Server ghi nhận tiền đã vào VNPay thành công.<br>- Không hủy tiền của khách, chuyển sản phẩm sang trạng thái **Hàng đặt trước (PRE_ORDER)**.<br>- Ghi chú cảnh báo tồn kho vào đơn hàng để bộ phận CSKH xử lý ngay lập tức. | **High** |

---

## V. BỘ TEST CASE CHỨC NĂNG: THÊM MỚI SẢN PHẨM (CREATE PRODUCT)

### 1. Phân quyền & Điều kiện tiên quyết
* **URL:** `/admin` (Tab Sản phẩm -> Nút "Thêm sản phẩm mới").
* **Quyền hạn:** Bắt buộc có quyền `products.create` hoặc vai trò `ADMIN`.

---

### 2. Danh sách Test Case Thêm Mới Sản Phẩm

| Test Case ID | Tên kịch bản | Phân loại | Tiền điều kiện | Các bước thực hiện | Dữ liệu đầu vào (Test Data) | Kết quả mong đợi | Mức độ ưu tiên |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **TC_PROD_ADD_01** | Thêm mới sản phẩm hợp lệ đầy đủ thông tin (Admin) | Positive | Đăng nhập tài khoản có quyền `ROLE_ADMIN` | 1. Mở Modal thêm sản phẩm.<br>2. Điền đầy đủ tên, danh mục, giá, mô tả, ảnh.<br>3. Khai báo 2 biến thể (kích thước/màu sắc) và tồn kho.<br>4. Bấm "Lưu sản phẩm". | - Tên: "Sofa Vải Hiện Đại Nordic"<br>- Giá: `18500000`<br>- Danh mục: "Sofa phòng khách"<br>- Biến thể 1: Xám - Tồn kho: 10<br>- Biến thể 2: Be - Tồn kho: 5 | - API `POST /api/v1/admin/products` trả về `201 Created`.<br>- Dữ liệu lưu vào bảng `products`, `product_variants`, `inventory`.<br>- Sản phẩm xuất hiện ngay lập tức trên bảng quản trị và trang chủ/danh mục khách hàng. | **Critical** |
| **TC_PROD_ADD_02** | Thêm mới sản phẩm với quyền Nhân viên (Staff có quyền `products.create`) | Permission | Tài khoản Staff được phân quyền `products.create` | 1. Đăng nhập tài khoản Staff.<br>2. Thực hiện thêm sản phẩm hợp lệ.<br>3. Bấm "Lưu". | Dữ liệu sản phẩm hợp lệ | - Thao tác thành công.<br>- Ghi audit log: `PRODUCT_CREATED` bởi tài khoản Staff. | **High** |
| **TC_PROD_ADD_03** | Chặn thao tác thêm mới khi không có quyền (Khách hàng/Staff bị tước quyền) | Permission / Security | Đăng nhập tài khoản không có quyền `products.create` | 1. Cố gắng gửi request API `POST /api/v1/admin/products` bằng token của Customer hoặc Staff không quyền. | Token Customer | - API trả về lỗi `403 Forbidden` (`AUTH_FORBIDDEN`).<br>- Giao diện ẩn nút "Thêm sản phẩm" hoặc chặn thao tác với thông báo từ chối quyền. | **Critical** |
| **TC_PROD_ADD_04** | Thêm mới thất bại do để trống trường bắt buộc (Tên sản phẩm rỗng) | Validation | Ở modal thêm sản phẩm | 1. Để trống tên sản phẩm.<br>2. Điền giá và danh mục.<br>3. Bấm "Lưu sản phẩm". | `name`: ""<br>`price`: `10000000` | - Hệ thống validate chặn submit.<br>- Báo lỗi: *"Tên sản phẩm không được để trống"*. | **High** |
| **TC_PROD_ADD_05** | Thêm mới thất bại do Giá bán không hợp lệ (Số âm hoặc bằng 0) | Boundary / Validation | Ở modal thêm sản phẩm | 1. Nhập tên sản phẩm hợp lệ.<br>2. Nhập giá bán: `-500000` hoặc `0`.<br>3. Bấm "Lưu". | `price`: `-500000` | - Hệ thống báo lỗi: *"Giá bán phải lớn hơn 0"*. Không lưu vào DB. | **High** |
| **TC_PROD_ADD_06** | Thêm mới thất bại do Trùng mã SKU biến thể đã tồn tại | Negative | Đã có sản phẩm khác dùng SKU `SF-VIC-01` | 1. Nhập sản phẩm mới.<br>2. Tạo biến thể với SKU trùng với SKU đã có trong DB.<br>3. Bấm "Lưu". | `sku`: "SF-VIC-01" | - Server trả về lỗi: *"Mã SKU [SF-VIC-01] đã tồn tại trong hệ thống, vui lòng chọn mã khác"*. | **High** |
| **TC_PROD_ADD_07** | Thêm sản phẩm diện Hàng đặt trước (Pre-order) | Business Flow | Sản phẩm thiết kế chưa có sẵn trong kho | 1. Điền thông tin sản phẩm.<br>2. Bật cờ "Hàng đặt trước" (`isPreorder = true`).<br>3. Đặt tồn kho = 0.<br>4. Bấm "Lưu". | `isPreorder`: `true`<br>`stockStatus`: "PRE_ORDER" | - Lưu thành công.<br>- Ngoài trang chi tiết sản phẩm hiển thị huy hiệu *"Hàng đặt trước"*, cho phép khách liên hệ hoặc đặt trước. | **Medium** |

---

## VI. BỘ TEST CASE CHỨC NĂNG: CẬP NHẬT SẢN PHẨM (UPDATE PRODUCT)

### 1. Phân quyền & Điều kiện tiên quyết
* **URL:** `/admin` (Tab Sản phẩm -> Nút Sửa/Edit).
* **Quyền hạn:** Bắt buộc có quyền `products.edit` hoặc vai trò `ADMIN`.
* Sản phẩm cần sửa đã tồn tại trong cơ sở dữ liệu.

---

### 2. Danh sách Test Case Cập Nhật Sản Phẩm

| Test Case ID | Tên kịch bản | Phân loại | Tiền điều kiện | Các bước thực hiện | Dữ liệu đầu vào (Test Data) | Kết quả mong đợi | Mức độ ưu tiên |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **TC_PROD_EDIT_01** | Cập nhật thông tin cơ bản sản phẩm thành công | Positive | Sản phẩm ID #12 đang hiển thị | 1. Bấm nút Sửa sản phẩm #12.<br>2. Sửa Tên sản phẩm, Giá bán và Mô tả.<br>3. Bấm "Cập nhật". | `name`: "Sofa Victoria Nâng Cấp 2026"<br>`price`: `32000000` | - API `PUT /api/v1/admin/products/12` trả về `200 OK`.<br>- Bảng sản phẩm và giao diện người dùng cập nhật tên và giá mới ngay lập tức.<br>- Ghi nhận `updated_at` mới trong DB. | **Critical** |
| **TC_PROD_EDIT_02** | Cập nhật số lượng tồn kho của biến thể sản phẩm | Positive | Biến thể sản phẩm đang có sẵn | 1. Mở tab Tồn kho biến thể.<br>2. Thay đổi số lượng có sẵn từ `5` thành `20`.<br>3. Bấm "Cập nhật". | `availableQuantity`: `20` | - Số lượng tồn kho trong bảng `inventory` cập nhật thành 20.<br>- Khách hàng có thể thêm tối đa 20 sản phẩm vào giỏ hàng. | **High** |
| **TC_PROD_EDIT_03** | Chặn thao tác cập nhật khi không có quyền | Permission | Đăng nhập tài khoản không có quyền `products.edit` | 1. Gửi request `PUT /api/v1/admin/products/12` từ tài khoản khách hàng. | User bình thường | - Server trả về `403 Forbidden`.<br>- Dữ liệu sản phẩm không bị thay đổi. | **Critical** |
| **TC_PROD_EDIT_04** | Cập nhật sản phẩm với ID không tồn tại | Negative | ID #999999 không có trong DB | 1. Gửi request cập nhật vào ID #999999. | ID: `999999` | - API trả về `404 Not Found` (`PRODUCT_NOT_FOUND`).<br>- Báo lỗi: *"Không tìm thấy sản phẩm cần cập nhật"*. | **Medium** |
| **TC_PROD_EDIT_05** | Cập nhật giá bán thành số âm | Validation | Đang ở modal chỉnh sửa | 1. Sửa giá bán thành `-1000`.<br>2. Bấm "Cập nhật". | `price`: `-1000` | - Validate chặn lại: *"Giá bán phải lớn hơn 0"*. Dữ liệu cũ được giữ nguyên. | **High** |
| **TC_PROD_EDIT_06** | Đổi trạng thái sản phẩm sang Tạm ẩn (INACTIVE) | Business Flow | Sản phẩm đang ACTIVE | 1. Chọn trạng thái "Tạm dừng kinh doanh / Ẩn".<br>2. Bấm "Lưu". | `status`: "INACTIVE" | - Sản phẩm không còn xuất hiện trong kết quả tìm kiếm và danh mục ngoài cửa hàng.<br>- Các đơn hàng đã đặt trong quá khứ chứa sản phẩm này vẫn xem được lịch sử bình thường. | **High** |

---

## VII. BỘ TEST CASE CHỨC NĂNG: XÓA SẢN PHẨM (DELETE PRODUCT)

### 1. Phân quyền & Điều kiện tiên quyết
* **URL:** `/admin` (Tab Sản phẩm -> Nút Xóa/Trash).
* **Quyền hạn:** Bắt buộc có quyền `products.delete` hoặc vai trò `ADMIN`.

---

### 2. Danh sách Test Case Xóa Sản Phẩm

| Test Case ID | Tên kịch bản | Phân loại | Tiền điều kiện | Các bước thực hiện | Dữ liệu đầu vào (Test Data) | Kết quả mong đợi | Mức độ ưu tiên |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **TC_PROD_DEL_01** | Xóa mềm sản phẩm vào thùng rác thành công (Soft Delete) | Positive | Sản phẩm đang ở trạng thái hiển thị | 1. Bấm biểu tượng Thùng rác tại sản phẩm #15.<br>2. Xác nhận hộp thoại "Bạn có chắc muốn xóa?". | ID: `15` | - API `DELETE /api/v1/admin/products/15` thực thi.<br>- Trạng thái sản phẩm đổi thành `isDeleted = true` hoặc `status = DELETED`.<br>- Sản phẩm biến mất khỏi tab "Đang hiển thị" và chuyển sang tab "Thùng rác".<br>- Khách hàng ngoài trang web không thể xem hay thêm vào giỏ sản phẩm này nữa. | **Critical** |
| **TC_PROD_DEL_02** | Khôi phục sản phẩm từ thùng rác (Restore) | Positive | Sản phẩm đang nằm trong tab "Thùng rác" | 1. Chuyển sang tab "Thùng rác".<br>2. Tìm sản phẩm #15 và bấm "Khôi phục". | ID: `15` | - API `PATCH /api/v1/admin/products/15/restore` chạy thành công.<br>- Sản phẩm quay trở lại tab "Đang hiển thị" và mở bán lại bình thường. | **High** |
| **TC_PROD_DEL_03** | Chặn thao tác xóa khi tài khoản không có quyền `products.delete` | Permission / Security | Tài khoản Staff chỉ có quyền xem, không có quyền xóa | 1. Cố gắng gửi request `DELETE /api/v1/admin/products/15`. | Staff thiếu quyền | - Server trả về `403 Forbidden`.<br>- Thông báo: *"Bạn không có quyền thực hiện xóa sản phẩm"*. Sản phẩm vẫn còn nguyên. | **Critical** |
| **TC_PROD_DEL_04** | Xóa vĩnh viễn sản phẩm chưa từng phát sinh đơn hàng (Hard Delete) | Edge Case | Sản phẩm mẫu mới tạo, chưa có đơn hàng liên kết | 1. Vào Thùng rác.<br>2. Bấm "Xóa vĩnh viễn".<br>3. Xác nhận cảnh báo bảo mật. | ID sản phẩm chưa có order | - Dữ liệu sản phẩm và biến thể được dọn dẹp sạch khỏi cơ sở dữ liệu MySQL. | **Medium** |
| **TC_PROD_DEL_05** | Chặn xóa vĩnh viễn sản phẩm ĐÃ TỪNG PHÁT SINH ĐƠN HÀNG (Data Integrity) | Security / Integrity | Sản phẩm đã có trong bảng `order_items` | 1. Cố gắng xóa vĩnh viễn sản phẩm đã từng được khách mua. | ID sản phẩm có order | - Ràng buộc toàn vẹn dữ liệu ngăn chặn thao tác (hoặc logic nghiệp vụ chặn lại).<br>- Báo lỗi thân thiện: *"Không thể xóa vĩnh viễn sản phẩm đã có lịch sử đơn hàng. Vui lòng sử dụng tính năng Ẩn sản phẩm"*. Không gây crash ứng dụng. | **Critical** |

---

## VIII. BẢNG TỔNG HỢP TEST COVERAGE

| Nhóm chức năng | Số lượng Test Case | Kịch bản Thành công (Positive) | Kịch bản Thất bại / Lỗi (Negative) | Kiểm tra Phân quyền (Security/RBAC) | Mức độ nghiêm trọng (Critical) |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **1. Đăng nhập** | 11 | 3 | 4 | 4 | 3 |
| **2. Quên mật khẩu** | 8 | 2 | 4 | 2 | 3 |
| **3. Thanh toán VNPay** | 7 | 2 | 3 | 2 | 3 |
| **4. Thêm mới sản phẩm** | 7 | 2 | 3 | 2 | 2 |
| **5. Cập nhật sản phẩm** | 6 | 2 | 2 | 2 | 2 |
| **6. Xóa sản phẩm** | 5 | 2 | 1 | 2 | 2 |
| **TỔNG CỘNG** | **44 Test Cases** | **13** | **17** | **14** | **15 Critical** |

---
*Tài liệu kiểm thử được biên soạn tự động chuẩn hoá cho hệ thống thương mại điện tử Nhà Xinh.*
