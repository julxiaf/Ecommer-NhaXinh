/**
 * services/index.ts
 * Điểm xuất khẩu trung tâm (Barrel Export) cho toàn bộ hệ thống services của Nhà Xinh.
 */

// Core HTTP Client & Endpoints
export * from "./apiClient";
export * from "./apiEndpoints";
export * from "./apiProgressTracker";

// Client Domain Services
export * from "./articleService";
export * from "./cartService";
export * from "./categoryService";
export * from "./chatbotService";
export * from "./checkoutService";
export * from "./clientCmsService";
export * from "./policies";
export * from "./productService";
export * from "./userService";

// Admin Specialized Services & State Machine
export * from "./admin/types";
export * from "./admin/adminService";
export * from "./admin/adminHttp";
export * from "./admin/catalogApi";
export * from "./admin/categoryAdminApi";
export * from "./admin/productAdminApi";
export * from "./admin/articleAdminApi";
export * from "./admin/orderApi";
export * from "./admin/orderStateMachine";
export * from "./admin/couponApi";
export * from "./admin/dashboardApi";
export * from "./admin/policyApi";
export * from "./admin/rbacApi";
