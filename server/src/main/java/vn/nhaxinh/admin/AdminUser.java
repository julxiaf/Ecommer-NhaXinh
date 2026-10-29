package vn.nhaxinh.admin;

import vn.nhaxinh.user.User;

/**
 * Lớp đại diện admin, kế thừa từ User (bảng `users`).
 */
public class AdminUser extends User {

    public AdminUser() {
        super();
    }

    public AdminUser(String username, String passwordHash) {
        super(username, passwordHash);
    }
}
