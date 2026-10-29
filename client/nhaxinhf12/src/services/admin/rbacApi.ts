import type { RoleDefinition, AdminStaff, AdminAuditLog, PermissionKey } from "./types";
import { API_BASE } from "../apiEndpoints";

const API = `${API_BASE}/admin`;

export interface ApiPermissionItem {
  id: number | string;
  code: string;
  name: string;
  module: string;
  description: string;
  roles?: string[];
}

interface ApiRole {
  id: number;
  code: string;
  name: string;
  description: string | null;
  isSystem?: boolean;
  permissions: string[];
}

interface ApiUser {
  id: number;
  username: string;
  email: string;
  fullName: string;
  phone: string | null;
  status: string;
  accountType?: string;
  roles: string[];
  lastLoginAt?: string | null;
  createdAt?: string;
}

interface ApiAuditLog {
  id: number;
  userId?: number | null;
  actorUserId?: number | null;
  username?: string | null;
  actorUsername?: string | null;
  actorFullName?: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  details: Record<string, any> | string | null;
  ipAddress: string | null;
  createdAt: string;
}

interface ApiPage<T> {
  content: T[];
  totalElements: number;
}

async function readError(response: Response): Promise<string> {
  const text = await response.text();
  if (!text) return `Yêu cầu thất bại (${response.status}).`;
  try {
    const body = JSON.parse(text) as { message?: string; error?: string };
    return body.message || body.error || text;
  } catch {
    return text;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });
  if (!response.ok) throw new Error(await readError(response));
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

const ROLE_NAME_MAP: Record<string, string> = {
  ADMIN: "Quản trị viên Hệ thống (Super Admin)",
  SUPER_ADMIN: "Quản trị viên Hệ thống (Super Admin)",
  MANAGER: "Quản lý Cửa hàng (Store Manager)",
  STAFF: "Nhân viên Bán hàng & CSKH",
  SALES: "Chuyên viên Tư vấn Bán hàng",
  WAREHOUSE: "Nhân viên Quản lý Kho vận",
  CUSTOMER: "Khách hàng Thành viên",
};

export const rbacApi = {
  // ── 1. QUẢN LÝ VAI TRÒ & QUYỀN HẠN (ROLES & PERMISSIONS) ──
  async getRoles(): Promise<RoleDefinition[]> {
    const data = await request<ApiRole[]>("/roles");
    return data.map((r) => ({
      id: String(r.id),
      code: r.code,
      name: r.name || ROLE_NAME_MAP[r.code] || r.code,
      description: r.description || "",
      permissions: (r.permissions || []) as PermissionKey[],
      isSystem:
        Boolean(r.isSystem) ||
        r.code === "ADMIN" ||
        r.code === "SUPER_ADMIN" ||
        r.code === "MANAGER" ||
        r.code === "STAFF" ||
        r.code === "CUSTOMER" ||
        r.code === "SALES" ||
        r.code === "WAREHOUSE",
    }));
  },

  async createRole(role: {
    code: string;
    name: string;
    description: string;
    permissions: string[];
  }): Promise<RoleDefinition> {
    const r = await request<ApiRole>("/roles", {
      method: "POST",
      body: JSON.stringify({
        code: role.code,
        name: role.name,
        description: role.description,
        permissions: role.permissions,
      }),
    });
    return {
      id: String(r.id),
      code: r.code,
      name: r.name,
      description: r.description || "",
      permissions: (r.permissions || []) as PermissionKey[],
      isSystem: false,
    };
  },

  async updateRole(
    roleId: string,
    payload: { name: string; description: string }
  ): Promise<RoleDefinition> {
    const r = await request<ApiRole>(`/roles/${encodeURIComponent(roleId)}`, {
      method: "PUT",
      body: JSON.stringify({
        name: payload.name,
        description: payload.description,
      }),
    });
    return {
      id: String(r.id),
      code: r.code,
      name: r.name,
      description: r.description || "",
      permissions: (r.permissions || []) as PermissionKey[],
      isSystem:
        Boolean(r.isSystem) ||
        r.code === "ADMIN" ||
        r.code === "SUPER_ADMIN" ||
        r.code === "MANAGER" ||
        r.code === "STAFF" ||
        r.code === "CUSTOMER" ||
        r.code === "SALES" ||
        r.code === "WAREHOUSE",
    };
  },

  async updateRolePermissions(
    roleId: string,
    permissions: string[]
  ): Promise<RoleDefinition> {
    const r = await request<ApiRole>(
      `/roles/${encodeURIComponent(roleId)}/permissions`,
      {
        method: "PUT",
        body: JSON.stringify({ permissions }),
      }
    );
    return {
      id: String(r.id),
      code: r.code,
      name: r.name,
      description: r.description || "",
      permissions: (r.permissions || []) as PermissionKey[],
      isSystem:
        Boolean(r.isSystem) ||
        r.code === "ADMIN" ||
        r.code === "SUPER_ADMIN" ||
        r.code === "MANAGER" ||
        r.code === "STAFF" ||
        r.code === "CUSTOMER" ||
        r.code === "SALES" ||
        r.code === "WAREHOUSE",
    };
  },

  async deleteRole(roleId: string): Promise<void> {
    await request<void>(`/roles/${encodeURIComponent(roleId)}`, {
      method: "DELETE",
    });
  },

  // ── 1.1 QUẢN LÝ DANH MỤC QUYỀN HẠN (PERMISSIONS - UC-RBAC-05 ĐẾN UC-RBAC-08) ──
  async getPermissions(module?: string): Promise<ApiPermissionItem[]> {
    const query = module ? `?module=${encodeURIComponent(module)}` : "";
    return request<ApiPermissionItem[]>(`/permissions${query}`);
  },

  async getPermissionDetail(id: number | string): Promise<ApiPermissionItem> {
    return request<ApiPermissionItem>(`/permissions/${encodeURIComponent(String(id))}`);
  },

  async createPermission(data: {
    code: string;
    name: string;
    module: string;
    description: string;
  }): Promise<ApiPermissionItem> {
    return request<ApiPermissionItem>("/permissions", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async updatePermission(
    id: number | string,
    data: { name: string; module: string; description: string }
  ): Promise<ApiPermissionItem> {
    return request<ApiPermissionItem>(`/permissions/${encodeURIComponent(String(id))}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  async deletePermission(id: number | string, force: boolean = true): Promise<{ message: string; id: string; code: string }> {
    return request<{ message: string; id: string; code: string }>(
      `/permissions/${encodeURIComponent(String(id))}?force=${force}`,
      {
        method: "DELETE",
      }
    );
  },

  // ── 2. QUẢN LÝ TÀI KHOẢN NHÂN SỰ (USERS / STAFF) ──
  async getStaff(): Promise<AdminStaff[]> {
    const raw = await request<ApiUser[] | ApiPage<ApiUser>>("/users");
    const users = Array.isArray(raw) ? raw : raw.content || [];
    const internalUsers = users.filter((u) =>
      (u.roles || []).some((r) => r !== "CUSTOMER")
    );
    const listToMap = internalUsers.length > 0 ? internalUsers : users;

    return listToMap.map((u) => {
      const roles = u.roles || [];
      const primaryRole =
        roles.find((r) => r === "ADMIN") ||
        roles.find((r) => r === "MANAGER") ||
        roles.find((r) => r === "SALES") ||
        roles.find((r) => r === "WAREHOUSE") ||
        roles.find((r) => r === "STAFF") ||
        roles[0] ||
        "STAFF";

      return {
        id: String(u.id),
        username: u.username,
        name: u.fullName || u.username,
        email: u.email,
        phone: u.phone || undefined,
        roleCode: primaryRole,
        roleName: ROLE_NAME_MAP[primaryRole] || primaryRole,
        status: u.status === "ACTIVE" ? "active" : "inactive",
        lastLogin: u.lastLoginAt
          ? new Date(u.lastLoginAt).toLocaleString("vi-VN")
          : "Hoạt động",
      };
    });
  },

  async createStaff(payload: {
    username: string;
    email: string;
    fullName: string;
    phone?: string;
    password?: string;
    roleCode: string;
  }): Promise<AdminStaff> {
    const u = await request<ApiUser>("/users", {
      method: "POST",
      body: JSON.stringify({
        username: payload.username,
        email: payload.email,
        fullName: payload.fullName,
        phone: payload.phone,
        password: payload.password,
        roles: [payload.roleCode],
      }),
    });
    const primaryRole = (u.roles && u.roles[0]) || payload.roleCode;
    return {
      id: String(u.id),
      username: u.username,
      name: u.fullName || u.username,
      email: u.email,
      phone: u.phone || undefined,
      roleCode: primaryRole,
      roleName: ROLE_NAME_MAP[primaryRole] || primaryRole,
      status: u.status === "ACTIVE" ? "active" : "inactive",
      lastLogin: "Vừa khởi tạo",
    };
  },

  async updateUserRoles(
    userId: string,
    roleCodes: string[]
  ): Promise<AdminStaff> {
    const u = await request<ApiUser>(
      `/users/${encodeURIComponent(userId)}/roles`,
      {
        method: "PUT",
        body: JSON.stringify({ roles: roleCodes }),
      }
    );
    const primaryRole = (u.roles && u.roles[0]) || roleCodes[0] || "STAFF";
    return {
      id: String(u.id),
      username: u.username,
      name: u.fullName || u.username,
      email: u.email,
      phone: u.phone || undefined,
      roleCode: primaryRole,
      roleName: ROLE_NAME_MAP[primaryRole] || primaryRole,
      status: u.status === "ACTIVE" ? "active" : "inactive",
      lastLogin: u.lastLoginAt
        ? new Date(u.lastLoginAt).toLocaleString("vi-VN")
        : "Hoạt động",
    };
  },

  async updateUserStatus(
    userId: string,
    status: "ACTIVE" | "INACTIVE" | "LOCKED",
    note?: string
  ): Promise<AdminStaff> {
    const u = await request<ApiUser>(
      `/users/${encodeURIComponent(userId)}/status`,
      {
        method: "PATCH",
        body: JSON.stringify({ status, note }),
      }
    );
    const primaryRole = (u.roles && u.roles[0]) || "STAFF";
    return {
      id: String(u.id),
      username: u.username,
      name: u.fullName || u.username,
      email: u.email,
      phone: u.phone || undefined,
      roleCode: primaryRole,
      roleName: ROLE_NAME_MAP[primaryRole] || primaryRole,
      status: u.status === "ACTIVE" ? "active" : "inactive",
      lastLogin: u.lastLoginAt
        ? new Date(u.lastLoginAt).toLocaleString("vi-VN")
        : "Hoạt động",
    };
  },

  // ── 3. NHẬT KÝ HỆ THỐNG (AUDIT LOGS) ──
  async createAuditLog(payload: {
    action: string;
    entityType: string;
    entityId?: string;
    target?: string;
    description?: string;
    metadata?: Record<string, any>;
  }): Promise<void> {
    await request<unknown>("/audit-logs", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async getAuditLogs(): Promise<AdminAuditLog[]> {
    const page = await request<ApiPage<ApiAuditLog>>("/audit-logs?size=100");
    const logs = page.content || [];
    return logs.map((l) => {
      let detailsObj: Record<string, any> = {};
      if (l.details) {
        if (typeof l.details === "object") {
          detailsObj = l.details;
        } else {
          try {
            detailsObj = JSON.parse(l.details);
          } catch {
            detailsObj = { raw: l.details };
          }
        }
      }

      let module: AdminAuditLog["module"] = "Hệ thống";
      if (l.entityType === "ORDER") module = "Đơn hàng";
      else if (l.entityType === "PRODUCT") module = "Sản phẩm";
      else if (l.entityType === "COLLECTION") module = "Bộ sưu tập";
      else if (l.entityType === "CATEGORY") {
        module = detailsObj.isCollection ? "Bộ sưu tập" : "Danh mục";
      } else if (
        l.entityType === "ROLE" ||
        l.entityType === "PERMISSION" ||
        l.entityType === "USER"
      ) {
        module = "Phân quyền";
      } else if (l.entityType === "PAYMENT") {
        module = "Thanh toán";
      } else if (l.entityType === "COUPON" || l.entityType === "DISCOUNT") {
        module = "Khuyến mãi";
      }

      let severity: AdminAuditLog["severity"] = "info";
      if (
        l.action.includes("DELETE") ||
        l.action.includes("CANCEL") ||
        l.action.includes("LOCK") ||
        (l.action === "USER_STATUS_UPDATE" && detailsObj.newStatus !== "ACTIVE")
      ) {
        severity = "danger";
      } else if (
        l.action.includes("CREATE") ||
        l.action.includes("CONFIRM") ||
        l.action.includes("RESTORE") ||
        (l.action === "USER_STATUS_UPDATE" && detailsObj.newStatus === "ACTIVE")
      ) {
        severity = "success";
      } else if (
        l.action.includes("UPDATE") ||
        l.action.includes("STATUS") ||
        l.action.includes("ASSIGN") ||
        l.action.includes("PERMISSION")
      ) {
        severity = "warning";
      }

      let description =
        typeof detailsObj.description === "string" && detailsObj.description
          ? detailsObj.description
          : `Hành động ${l.action} trên ${l.entityType} #${l.entityId || ""}`;

      if (!detailsObj.description) {
        switch (l.action) {
          // ── Phân quyền (RBAC) ──
          case "ROLE_CREATE":
          case "ROLE_CREATED":
            description = `Khởi tạo vai trò mới [${detailsObj.code || l.entityId}] - ${detailsObj.name || ""}`;
            break;
          case "ROLE_UPDATE":
          case "ROLE_UPDATED":
            description = `Cập nhật thông tin vai trò [${detailsObj.code || l.entityId}]: "${detailsObj.before?.name || detailsObj.previousName || ""}" → "${detailsObj.after?.name || detailsObj.name || ""}"`;
            break;
          case "ROLE_PERMISSIONS_UPDATE":
          case "PERMISSION_GRANTED": {
            const afterPerms = detailsObj.after || detailsObj.permissions || [];
            const addedPerms = detailsObj.added || detailsObj.addedPermissions || [];
            const removedPerms = detailsObj.removed || detailsObj.removedPermissions || [];
            const totalPerms = Array.isArray(afterPerms) ? afterPerms.length : 0;
            const addedCount = Array.isArray(addedPerms) ? addedPerms.length : 0;
            const removedCount = Array.isArray(removedPerms) ? removedPerms.length : 0;
            detailsObj.addedPermissions = addedPerms;
            detailsObj.removedPermissions = removedPerms;
            description = `Cập nhật ma trận phân quyền cho vai trò [${detailsObj.code || l.entityId}] (Tổng: ${totalPerms} quyền${addedCount || removedCount ? `, +${addedCount} / -${removedCount}` : ""})`;
            break;
          }
          case "ROLE_DELETE":
          case "ROLE_DELETED":
            description = `Xóa vai trò tùy chỉnh [${detailsObj.code || l.entityId}] - ${detailsObj.name || ""}`;
            break;
          case "PERMISSION_CREATE":
            description = `Thêm mã quyền hạn hệ thống mới: ${detailsObj.code || l.entityId} (${detailsObj.description || ""})`;
            break;
          case "PERMISSION_UPDATE":
            description = `Cập nhật quyền hạn [${detailsObj.code || l.entityId}]`;
            break;
          case "PERMISSION_DELETE":
            description = `Xóa mã quyền hạn hệ thống: ${detailsObj.code || l.entityId}`;
            break;
          case "ASSIGN_ROLES": {
            const prev = detailsObj.before || detailsObj.previousRoles || [];
            const next = detailsObj.after || detailsObj.newRoles || [];
            description = `Phân công vai trò cho nhân sự ${detailsObj.fullName || detailsObj.username || detailsObj.targetFullName || `#${l.entityId}`}: [${Array.isArray(prev) ? prev.join(", ") : ""}] → [${Array.isArray(next) ? next.join(", ") : ""}]`;
            break;
          }
          case "USER_CREATE":
          case "STAFF_INVITED": {
            const roles = detailsObj.roles || detailsObj.assignedRoles || [];
            description = `Tạo tài khoản nhân sự nội bộ: ${detailsObj.fullName || detailsObj.username || detailsObj.targetFullName || `#${l.entityId}`} (${detailsObj.email || detailsObj.targetEmail || ""}) - Vai trò: ${Array.isArray(roles) ? roles.join(", ") : ""}`;
            break;
          }
          case "USER_STATUS_UPDATE":
            description = `Đổi trạng thái tài khoản nhân sự ${detailsObj.fullName || detailsObj.username || detailsObj.targetFullName || `#${l.entityId}`}: ${detailsObj.oldStatus || detailsObj.previousStatus || ""} → ${detailsObj.newStatus || ""}`;
            break;

          // ── Sản phẩm & Danh mục & Bộ sưu tập ──
          case "ADMIN_CREATE_PRODUCT":
          case "PRODUCT_CREATED":
            description = `Tạo mới sản phẩm "${detailsObj.name || ""}" (${detailsObj.variantsCount || 1} biến thể)`;
            break;
          case "ADMIN_UPDATE_PRODUCT":
          case "PRODUCT_UPDATED":
            description = `Cập nhật thông tin sản phẩm "${detailsObj.name || ""}"`;
            break;
          case "ADMIN_STATUS_PRODUCT":
            description = `Đổi trạng thái sản phẩm #${l.entityId} sang ${detailsObj.status || ""}`;
            break;
          case "ADMIN_DELETE_PRODUCT":
          case "PRODUCT_DELETED":
            description = `Lưu trữ / ẩn sản phẩm #${l.entityId}`;
            break;
          case "ADMIN_CREATE_CATEGORY":
          case "CATEGORY_CREATED":
          case "COLLECTION_CREATED":
            description = `Tạo mới ${detailsObj.isCollection ? "bộ sưu tập" : "danh mục"} "${detailsObj.name || l.entityId}" (/${detailsObj.slug || ""})`;
            break;
          case "ADMIN_UPDATE_CATEGORY":
          case "CATEGORY_UPDATED":
          case "COLLECTION_UPDATED":
            description = `Cập nhật ${detailsObj.isCollection ? "bộ sưu tập" : "danh mục"} "${detailsObj.name || l.entityId}" (/${detailsObj.slug || ""})`;
            break;
          case "ADMIN_DELETE_CATEGORY":
          case "CATEGORY_DELETED":
          case "COLLECTION_DELETED":
            description = `Chuyển danh mục / bộ sưu tập #${l.entityId} vào thùng rác`;
            break;
          case "ADMIN_RESTORE_CATEGORY":
          case "CATEGORY_RESTORED":
            description = `Khôi phục danh mục / bộ sưu tập #${l.entityId} từ thùng rác`;
            break;

          // ── Đơn hàng & Chính sách ──
          case "ADMIN_ORDER_STATUS":
          case "ORDER_STATUS_CHANGED":
            description = `Cập nhật trạng thái đơn hàng ${detailsObj.orderNumber || l.entityId}: ${detailsObj.previousStatus || ""} → ${detailsObj.status || ""}`;
            break;
          case "ADMIN_ORDER_CANCEL":
            description = `Hủy đơn hàng ${detailsObj.orderNumber || l.entityId} (Lý do: ${detailsObj.reason || "Admin hủy"})`;
            break;
          case "ADMIN_ORDER_PAYMENT_CONFIRM":
          case "PAYMENT_CONFIRMED":
            description = `Xác nhận thanh toán cho đơn hàng ${detailsObj.orderNumber || l.entityId}`;
            break;
          case "ADMIN_CREATE_POLICY":
            description = `Tạo chính sách "${detailsObj.title || detailsObj.slug || ""}"`;
            break;
          case "ADMIN_UPDATE_POLICY":
            description = `Cập nhật chính sách "${detailsObj.title || detailsObj.slug || ""}"`;
            break;
        }
      }

      const actorUsername = l.username || l.actorUsername || null;
      const actorUserId = l.userId ?? l.actorUserId ?? null;

      const targetLabel =
        detailsObj.target ||
        (detailsObj.code
          ? `${l.entityType} [${detailsObj.code}]`
          : detailsObj.name
            ? `${l.entityType}: ${detailsObj.name}`
            : detailsObj.fullName || detailsObj.targetFullName
              ? `${detailsObj.fullName || detailsObj.targetFullName} (${detailsObj.username || detailsObj.targetUsername || l.entityId})`
              : `${l.entityType} #${l.entityId || "N/A"}`);

      return {
        id: `LOG-${l.id}`,
        actor: {
          name: l.actorFullName || actorUsername || "Quản trị viên Hệ thống",
          email: actorUsername ? `${actorUsername}@nhaxinh.com` : "admin@nhaxinh.com",
          role: "Quản trị viên",
          isSystem: !actorUserId,
        },
        action: l.action as AdminAuditLog["action"],
        module,
        target: targetLabel,
        description,
        timestamp: l.createdAt
          ? new Date(l.createdAt).toLocaleString("vi-VN")
          : new Date().toLocaleString("vi-VN"),
        ipAddress: l.ipAddress || "127.0.0.1",
        metadata: detailsObj,
        severity,
      };
    });
  },
};
