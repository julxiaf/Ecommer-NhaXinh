II. Nhóm Use Case quản lý phân quyền
UC-RBAC-01 – Xem danh sách vai trò
Thông tin Use Case
Read

Tác nhân chính: Admin,SUPER ADMIN
- Mục tiêu: Xem và tra cứu các vai trò được cấu hình trong hệ thống.
- Điều kiện trước: Admin đã đăng nhập và có quyền roles:view.
- Điều kiện sau: Danh sách vai trò được hiển thị theo điều kiện tìm kiếm.
  Luồng chính
1. Admin chọn menu Phân quyền → Vai trò.
2. Hệ thống truy vấn danh sách vai trò từ cơ sở dữ liệu.
3. Hệ thống hiển thị mã vai trò, tên vai trò, mô tả, trạng thái và số tài khoản được gán.
4. Admin nhập từ khóa hoặc lọc theo trạng thái.
5. Hệ thống trả về danh sách phù hợp và hỗ trợ phân trang.
   Luồng ngoại lệ
- Không có dữ liệu: hiển thị thông báo chưa có vai trò phù hợp.
- Không đủ quyền: từ chối truy cập chức năng.
- Lỗi truy vấn: thông báo không thể tải danh sách.

UC-RBAC-02 – Thêm vai trò
Thông tin Use Case
Create

Tác nhân chính: Admin
- Mục tiêu: Tạo vai trò mới để phân loại tài khoản theo trách nhiệm công việc.
- Điều kiện trước: Admin có quyền roles:create.
- Điều kiện sau: Vai trò được lưu thành công và xuất hiện trong danh sách.
  Dữ liệu nhập
- Mã vai trò, ví dụ CUSTOMER_SERVICE.
- Tên vai trò, ví dụ Chăm sóc khách hàng.
- Mô tả và trạng thái hoạt động.
- Danh sách quyền hạn được cấp (có thể chọn sau nếu hệ thống cho phép).
  Luồng chính
1. Admin chọn Thêm vai trò.
2. Hệ thống hiển thị biểu mẫu tạo mới.
3. Admin nhập thông tin vai trò.
4. Admin chọn các quyền phù hợp từ danh mục quyền có sẵn.
5. Hệ thống kiểm tra trường bắt buộc, định dạng và tính duy nhất của mã vai trò.
6. Hệ thống lưu vai trò và các liên kết quyền tương ứng trong một giao dịch.
7. Hệ thống thông báo tạo thành công và cập nhật danh sách.
   Luồng ngoại lệ
- Mã vai trò đã tồn tại: yêu cầu nhập mã khác.
- Thiếu tên hoặc mã: hiển thị lỗi tại trường tương ứng.
- Quyền được chọn không tồn tại hoặc không còn hoạt động: từ chối lưu hoặc yêu cầu chọn lại.
- Admin không có quyền tạo: từ chối thao tác tại backend.

UC-RBAC-03 – Cập nhật vai trò
Thông tin Use Case
Update

Tác nhân chính: Admin
- Mục tiêu: Chỉnh sửa thông tin và quyền hạn của một vai trò.
- Điều kiện trước: Vai trò đã tồn tại; Admin có quyền roles:edit.
- Điều kiện sau: Thông tin mới được lưu; quyền truy cập liên quan được cập nhật theo chính sách hiệu lực của hệ thống.
  Luồng chính
1. Admin tìm kiếm và chọn vai trò cần sửa.
2. Hệ thống hiển thị thông tin hiện tại và các quyền đang được gán.
3. Admin chỉnh sửa tên, mô tả, trạng thái hoặc danh sách quyền.
4. Admin chọn Lưu thay đổi.
5. Hệ thống kiểm tra dữ liệu và quyền thao tác.
6. Hệ thống cập nhật thông tin vai trò và bảng liên kết role_permissions.
7. Hệ thống ghi nhật ký thay đổi và thông báo kết quả.
   Luồng ngoại lệ
- Vai trò đã bị xóa hoặc thay đổi bởi người khác: yêu cầu tải lại dữ liệu.
- Dữ liệu không hợp lệ: giữ biểu mẫu và hiển thị lỗi.
- Thay đổi khiến không còn tài khoản quản trị hợp lệ: từ chối thao tác nguy hiểm.
- Thay đổi quyền: hệ thống phải cập nhật hoặc vô hiệu hóa thông tin quyền đã lưu trong phiên/token theo cơ chế xác thực đang sử dụng.

UC-RBAC-04 – Xóa hoặc ngừng hoạt động vai trò
Thông tin Use Case
Delete

Tác nhân chính: Admin
- Mục tiêu: Loại bỏ vai trò không còn sử dụng hoặc ngăn vai trò được gán mới.
- Điều kiện trước: Admin có quyền roles:delete; vai trò tồn tại.
- Điều kiện sau: Vai trò được xóa hợp lệ hoặc chuyển sang trạng thái ngừng hoạt động.
  Luồng chính
1. Admin chọn chức năng xóa tại vai trò cần xử lý.
2. Hệ thống kiểm tra vai trò hệ thống và số tài khoản đang sử dụng.
3. Hệ thống hiển thị thông tin vai trò và yêu cầu xác nhận.
4. Admin xác nhận thao tác.
5. Hệ thống xóa vai trò nếu không vi phạm ràng buộc dữ liệu; nếu không phù hợp để xóa, hệ thống cho phép ngừng hoạt động theo chính sách.
6. Hệ thống ghi nhật ký và thông báo kết quả.
   Luồng ngoại lệ
- Vai trò ADMIN mặc định hoặc vai trò hệ thống được bảo vệ: không cho xóa.
- Vai trò còn được gán cho tài khoản: yêu cầu gỡ gán hoặc ngừng hoạt động trước.
- Xóa làm mất quyền quản trị cuối cùng: từ chối.
- Admin hủy xác nhận: dữ liệu không thay đổi.

UC-RBAC-05 – Xem danh sách quyền hạn
- Tác nhân: Admin.
- Mục tiêu: Tra cứu danh mục quyền được hỗ trợ trong hệ thống.
- Điều kiện trước: Admin đã đăng nhập và có quyền permissions:view.
- Điều kiện sau: Danh sách quyền được hiển thị.
Luồng chính
1. Admin mở menu Phân quyền → Quyền hạn.
2. Hệ thống tải danh sách quyền.
3. Hệ thống hiển thị mã quyền, tên quyền, phân hệ, mô tả và trạng thái.
4. Admin tìm kiếm theo mã quyền, tên hoặc phân hệ.
5. Hệ thống hiển thị kết quả tương ứng.
Luồng ngoại lệ: Danh sách trống, lỗi tải dữ liệu hoặc tài khoản không đủ quyền.
UC-RBAC-06 – Thêm quyền hạn
- Tác nhân: Admin có quyền permissions:create.
- Mục tiêu: Khai báo một quyền mới mà hệ thống có khả năng thực thi.
- Điều kiện trước: Admin được phép quản lý danh mục quyền.
- Điều kiện sau: Quyền mới được lưu và có thể được gán cho vai trò nếu đã được triển khai đầy đủ.
Luồng chính
1. Admin chọn Thêm quyền.
2. Hệ thống hiển thị biểu mẫu.
3. Admin nhập mã quyền, tên, phân hệ và mô tả.
4. Hệ thống kiểm tra mã quyền trùng lặp và dữ liệu bắt buộc.
5. Hệ thống xác nhận quyền đó được backend hỗ trợ.
6. Hệ thống lưu quyền và thông báo thành công.
Luồng ngoại lệ
- Mã quyền trùng: yêu cầu nhập mã khác.
- Quyền chưa được backend hỗ trợ: không cho kích hoạt như một quyền bảo mật thực tế.
- Dữ liệu không hợp lệ hoặc thiếu quyền thao tác: từ chối lưu.
UC-RBAC-07 – Cập nhật quyền hạn
- Tác nhân: Admin có quyền permissions:edit.
- Mục tiêu: Chỉnh sửa tên, mô tả hoặc trạng thái của quyền.
- Điều kiện trước: Quyền đã tồn tại.
- Điều kiện sau: Thông tin quyền được cập nhật và các vai trò liên quan được xử lý nhất quán.
Luồng chính
1. Admin chọn quyền cần sửa.
2. Hệ thống tải thông tin quyền hiện tại và các vai trò đang sử dụng.
3. Admin chỉnh sửa thông tin.
4. Hệ thống kiểm tra tính hợp lệ.
5. Hệ thống lưu thay đổi và ghi nhật ký.
Luồng ngoại lệ
- Quyền đã bị thay đổi đồng thời: yêu cầu tải lại.
- Quyền đang được sử dụng: cảnh báo trước khi thay đổi trạng thái.
- Thay đổi mã quyền làm ảnh hưởng cấu hình backend: không cho đổi tùy ý; cần triển khai đồng bộ trước khi cập nhật.
UC-RBAC-08 – Xóa hoặc ngừng hoạt động quyền hạn
- Tác nhân: Admin có quyền permissions:delete.
- Mục tiêu: Ngừng cung cấp quyền không còn cần thiết.
- Điều kiện trước: Quyền tồn tại.
- Điều kiện sau: Quyền được xóa hợp lệ hoặc chuyển sang trạng thái ngừng hoạt động.
Luồng chính
1. Admin chọn quyền cần xóa.
2. Hệ thống kiểm tra các vai trò đang sử dụng quyền.
3. Hệ thống hiển thị cảnh báo và yêu cầu xác nhận.
4. Admin xác nhận.
5. Hệ thống xóa liên kết hoặc ngừng hoạt động quyền theo chính sách.
6. Hệ thống ghi nhật ký thao tác.
Luồng ngoại lệ: Nếu quyền vẫn được sử dụng hoặc là quyền thiết yếu của hệ thống, thao tác xóa bị từ chối hoặc yêu cầu xử lý các liên kết trước.
UC-RBAC-09 – Gán quyền cho vai trò
- Tác nhân: Admin có quyền roles:assign_permissions.
- Mục tiêu: Xác định các chức năng mà một vai trò được phép thực hiện.
- Điều kiện trước: Vai trò tồn tại; các quyền được gán là quyền hợp lệ.
- Điều kiện sau: Danh sách quyền của vai trò được cập nhật.
Luồng chính
1. Admin chọn vai trò.
2. Hệ thống hiển thị cây quyền theo các phân hệ: Sản phẩm, Bộ sưu tập, Đơn hàng, Khách hàng, Chăm sóc khách hàng, Báo cáo.
3. Admin đánh dấu hoặc bỏ đánh dấu các quyền.
4. Admin chọn Lưu quyền.
5. Hệ thống kiểm tra quyền thao tác và tính hợp lệ của các quyền được chọn.
6. Hệ thống cập nhật bảng role_permissions trong một giao dịch.
7. Hệ thống thông báo kết quả và áp dụng thay đổi theo cơ chế xác thực.
Luồng ngoại lệ
- Vai trò không tồn tại hoặc đã bị vô hiệu hóa: từ chối cập nhật.
- Quyền không hợp lệ: không lưu các quyền không được hỗ trợ.
- Giao dịch thất bại: rollback để tránh trạng thái gán quyền không nhất quán.
UC-RBAC-10 – Gán vai trò cho tài khoản
- Tác nhân: Admin có quyền users:assign_roles.
- Mục tiêu: Phân công vai trò cho tài khoản nhân viên.
- Điều kiện trước: Tài khoản tồn tại; vai trò được chọn đang hoạt động.
- Điều kiện sau: Vai trò của tài khoản được cập nhật.
Luồng chính
1. Admin mở danh sách tài khoản quản trị.
2. Admin chọn tài khoản cần phân quyền.
3. Hệ thống hiển thị vai trò hiện tại.
4. Admin chọn hoặc bỏ chọn vai trò.
5. Hệ thống kiểm tra vai trò và quyền thực hiện thao tác.
6. Hệ thống lưu liên kết trong user_roles.
7. Hệ thống ghi nhật ký và cập nhật hiệu lực phân quyền.
Luồng ngoại lệ
- Tài khoản không tồn tại hoặc bị khóa: không cho gán vai trò.
- Vai trò ngừng hoạt động: không cho gán mới.
- Thao tác làm mất tài khoản quản trị cuối cùng: từ chối nếu vi phạm chính sách an toàn.