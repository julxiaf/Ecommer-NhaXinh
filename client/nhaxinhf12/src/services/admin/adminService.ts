import type {
  AdminCategory,
  AdminProduct,
  AdminOrder,
  RoleDefinition,
  PermissionKey,
  AdminStaff,
  AdminDiscount,
  AdminArticle,
  AdminNotification,
  AdminTicket,
  AdminSettingsConfig,
  AdminAuditLog,
  AdminPermissionItem,
} from "./types";
import { catalogApi, type AdminProductInput } from "./catalogApi";
import { orderApi } from "./orderApi";
import { rbacApi } from "./rbacApi";
import { articleService } from "../articleService";
import { couponApi } from "./couponApi";
import { isCollectionCategory } from "../categoryService";
import { DEFAULT_PLACEHOLDER_IMAGE } from "../productService";
import {
  ALL_PERMISSIONS,
  INITIAL_ROLES,
  INITIAL_CATEGORIES,
  INITIAL_PRODUCTS,
  INITIAL_DISCOUNTS,
  INITIAL_ARTICLES,
  INITIAL_NOTIFICATIONS,
  INITIAL_TICKETS,
  INITIAL_SETTINGS,
  INITIAL_AUDIT_LOGS,
  type SystemPermissionItem,
} from "./adminDefaults";

export {
  ALL_PERMISSIONS,
  INITIAL_ROLES,
  INITIAL_CATEGORIES,
  INITIAL_PRODUCTS,
  INITIAL_DISCOUNTS,
  INITIAL_ARTICLES,
  INITIAL_NOTIFICATIONS,
  INITIAL_TICKETS,
  INITIAL_SETTINGS,
  INITIAL_AUDIT_LOGS,
  type SystemPermissionItem,
};

// ══════════════════════════════════════════════════════════
// 1. UTILITY HELPERS
// ══════════════════════════════════════════════════════════

/**
 * Tự sinh slug tiếng Việt chuẩn SEO.
 */
export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[đĐ]/g, "d")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

const DEFAULT_ADMIN_ACTOR: AdminAuditLog["actor"] = {
  name: "Quản trị viên",
  role: "Quản trị hệ thống",
};


const AUDIT_ENTITY_TYPE_MAP: Record<string, string> = {
  "Phân quyền": "ROLE",
  "Đơn hàng": "ORDER",
  "Thanh toán": "PAYMENT",
  "Sản phẩm": "PRODUCT",
  "Danh mục": "CATEGORY",
  "Bộ sưu tập": "COLLECTION",
  "Khuyến mãi": "COUPON",
  "CSKH": "TICKET",
  "Hệ thống": "SYSTEM",
};
// Tự động dọn dẹp dữ liệu nhaxinh_admin_* cũ trong localStorage (nếu có từ phiên bản cũ)
if (typeof window !== "undefined") {
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith("nhaxinh_admin_")) {
        keysToRemove.push(k);
      }
    }
    keysToRemove.forEach((k) => localStorage.removeItem(k));
  } catch {
    // ignore
  }
}

// ══════════════════════════════════════════════════════════
// 2. ADMIN API SERVICE LAYER
// ══════════════════════════════════════════════════════════

class AdminApiService {
  private inMemoryStore = new Map<string, unknown>();
  private cache = new Map<string, { data: unknown; expiresAt: number }>();
  private inFlightRequests = new Map<string, Promise<unknown>>();

  private getStorage<T>(key: string, fallback: T): T {
    if (this.inMemoryStore.has(key)) {
      return this.inMemoryStore.get(key) as T;
    }
    return fallback;
  }

  private setStorage<T>(key: string, val: T): void {
    this.inMemoryStore.set(key, val);
  }

  private async fetchWithCache<T>(
    key: string,
    ttlMs: number,
    fetcher: () => Promise<T>,
    force = false
  ): Promise<T> {
    const now = Date.now();
    if (!force && this.cache.has(key)) {
      const entry = this.cache.get(key);
      if (entry && entry.expiresAt > now) {
        return entry.data as T;
      }
    }

    if (this.inFlightRequests.has(key)) {
      return this.inFlightRequests.get(key) as Promise<T>;
    }

    const promise = (async () => {
      try {
        const data = await fetcher();
        this.cache.set(key, { data, expiresAt: Date.now() + ttlMs });
        this.setStorage(key, data);
        return data;
      } finally {
        this.inFlightRequests.delete(key);
      }
    })();

    this.inFlightRequests.set(key, promise);
    return promise;
  }

  public invalidateCache(keyPattern?: string): void {
    if (!keyPattern) {
      this.cache.clear();
      return;
    }
    for (const k of Array.from(this.cache.keys())) {
      if (k.includes(keyPattern)) {
        this.cache.delete(k);
      }
    }
  }

  // ── 1. Roles & Permissions ──
  async getRoles(force = false): Promise<RoleDefinition[]> {
    return this.fetchWithCache(
      "roles",
      5 * 60 * 1000,
      async () => {
        try {
          const list = await rbacApi.getRoles();
          if (list && list.length > 0) {
            return list;
          }
        } catch (e) {
          console.warn("Lấy vai trò từ API thất bại, dùng dữ liệu dự phòng:", e);
        }
        return this.getStorage<RoleDefinition[]>("roles", INITIAL_ROLES);
      },
      force
    );
  }

  async saveRole(role: Partial<RoleDefinition>, actor?: AdminAuditLog["actor"]): Promise<void> {
    const currentList = await this.getRoles();
    const code = (role.code || "CUSTOM_ROLE").trim().toUpperCase();
    const name = (role.name || code).trim();
    const description = (role.description || "").trim();
    const permissions = (role.permissions || []) as PermissionKey[];

    let createdRole: RoleDefinition;
    try {
      createdRole = await rbacApi.createRole({ code, name, description, permissions });
    } catch (e) {
      console.warn("Tạo vai trò qua API thất bại, lưu cục bộ:", e);
      createdRole = {
        id: role.id || `role-${Date.now()}`,
        code,
        name,
        description,
        permissions,
        isSystem: false,
      };
    }

    const updatedList = [
      ...currentList.filter((r) => r.code !== createdRole.code && r.id !== createdRole.id),
      createdRole,
    ];
    this.setStorage("roles", updatedList);
    this.invalidateCache("roles");

    await this.logActivity({
      actor: actor || DEFAULT_ADMIN_ACTOR,
      action: role.id ? "ROLE_UPDATED" : "ROLE_CREATED",
      module: "Phân quyền",
      target: `Vai trò ${name} [${code}]`,
      description: `Khởi tạo vai trò nghiệp vụ mới [${code}] - ${name} với ${permissions.length} quyền truy cập.`,
      metadata: {
        roleId: createdRole.id,
        code,
        name,
        description,
        permissionsCount: permissions.length,
        permissions,
      },
      severity: "success",
    });
  }

  async updateRole(
    roleId: string,
    data: { name: string; description: string },
    actor?: AdminAuditLog["actor"],
  ): Promise<void> {
    const currentList = await this.getRoles();
    const existing = currentList.find((r) => r.id === roleId);
    const previousName = existing?.name || "";
    const previousDescription = existing?.description || "";

    try {
      await rbacApi.updateRole(roleId, data);
    } catch (e) {
      console.warn("Cập nhật vai trò qua API thất bại, lưu cục bộ:", e);
    }

    const updatedList = currentList.map((r) =>
      r.id === roleId ? { ...r, name: data.name, description: data.description } : r,
    );
    this.setStorage("roles", updatedList);
    this.invalidateCache("roles");

    await this.logActivity({
      actor: actor || DEFAULT_ADMIN_ACTOR,
      action: "ROLE_UPDATED",
      module: "Phân quyền",
      target: `Vai trò ${data.name} [${existing?.code || roleId}]`,
      description: `Cập nhật thông tin vai trò [${existing?.code || roleId}]: "${previousName}" → "${data.name}".`,
      metadata: {
        roleId,
        code: existing?.code,
        previousName,
        newName: data.name,
        previousDescription,
        newDescription: data.description,
      },
      severity: "warning",
    });
  }

  async updateRolePermissions(
    roleId: string,
    permissions: PermissionKey[],
    actor?: AdminAuditLog["actor"],
  ): Promise<void> {
    const currentList = await this.getRoles();
    const existing = currentList.find((r) => r.id === roleId);
    const previousPermissions = existing?.permissions || [];
    const addedPermissions = permissions.filter((p) => !previousPermissions.includes(p));
    const removedPermissions = previousPermissions.filter((p) => !permissions.includes(p));

    try {
      await rbacApi.updateRolePermissions(roleId, permissions);
    } catch (e) {
      console.warn("Cập nhật quyền vai trò qua API thất bại, lưu cục bộ:", e);
    }

    const updatedList = currentList.map((r) => (r.id === roleId ? { ...r, permissions } : r));
    this.setStorage("roles", updatedList);
    this.invalidateCache("roles");

    await this.logActivity({
      actor: actor || DEFAULT_ADMIN_ACTOR,
      action: "PERMISSION_GRANTED",
      module: "Phân quyền",
      target: `Vai trò ${existing?.name || roleId} [${existing?.code || roleId}]`,
      description: `Cập nhật ma trận phân quyền cho vai trò [${existing?.code || roleId}] (Tổng: ${permissions.length} quyền; Cấp thêm: +${addedPermissions.length}, Thu hồi: -${removedPermissions.length}).`,
      metadata: {
        roleId,
        code: existing?.code,
        roleName: existing?.name,
        previousCount: previousPermissions.length,
        newCount: permissions.length,
        addedPermissions,
        removedPermissions,
        permissions,
      },
      severity: "warning",
    });
  }

  async deleteRole(roleId: string, actor?: AdminAuditLog["actor"]): Promise<void> {
    const currentList = await this.getRoles();
    const existing = currentList.find((r) => r.id === roleId);

    try {
      await rbacApi.deleteRole(roleId);
    } catch (e) {
      console.warn("Xóa vai trò qua API thất bại, xóa cục bộ:", e);
    }

    this.setStorage(
      "roles",
      currentList.filter((r) => r.id !== roleId),
    );
    this.invalidateCache("roles");

    await this.logActivity({
      actor: actor || DEFAULT_ADMIN_ACTOR,
      action: "ROLE_DELETED",
      module: "Phân quyền",
      target: `Vai trò ${existing?.name || roleId} [${existing?.code || roleId}]`,
      description: `Xóa vai trò tùy chỉnh [${existing?.code || roleId}] - ${existing?.name || ""}.`,
      metadata: {
        roleId,
        code: existing?.code,
        name: existing?.name,
        permissionsCount: existing?.permissions.length || 0,
      },
      severity: "danger",
    });
  }

  // ── 1.1 Permissions Catalog ──
  async getPermissions(module?: string, force = false): Promise<AdminPermissionItem[]> {
    const cacheKey = `permissions_catalog_${module || "all"}`;
    return this.fetchWithCache(
      cacheKey,
      5 * 60 * 1000,
      async () => {
        try {
          const apiPerms = await rbacApi.getPermissions(module);
          if (apiPerms && apiPerms.length > 0) {
            const mapped: AdminPermissionItem[] = apiPerms.map((p) => ({
              id: String(p.id),
              code: p.code,
              name: p.name,
              module: p.module,
              description: p.description,
              status: "active",
              roleCount: p.roles ? p.roles.length : 0,
              roles: p.roles || [],
            }));
            this.setStorage("permissions_catalog", mapped);
            return mapped;
          }
        } catch (e) {
          console.warn("Lấy danh mục quyền từ API thất bại, dùng dữ liệu dự phòng:", e);
        }

        const defaultPerms: AdminPermissionItem[] = ALL_PERMISSIONS.map((p) => ({
          id: String(p.id),
          code: p.key,
          name: p.name,
          module: p.module,
          description: p.description,
          status: "active",
          roleCount: 0,
          roles: [],
        }));
        const stored = this.getStorage<AdminPermissionItem[]>("permissions_catalog", defaultPerms);
        return module && module !== "all" ? stored.filter((p) => p.module === module) : stored;
      },
      force
    );
  }

  async savePermission(
    perm: { code: string; name: string; module: string; description: string },
    actor?: AdminAuditLog["actor"],
  ): Promise<AdminPermissionItem> {
    const code = perm.code.trim();
    const name = perm.name.trim();
    const module = perm.module.trim();
    const description = perm.description.trim();
    let created: AdminPermissionItem;

    try {
      const res = await rbacApi.createPermission({ code, name, module, description });
      created = {
        id: String(res.id),
        code: res.code,
        name: res.name,
        module: res.module,
        description: res.description,
        status: "active",
        roleCount: 0,
        roles: [],
      };
    } catch (e) {
      console.warn("Tạo quyền qua API thất bại, lưu cục bộ:", e);
      created = {
        id: `perm-${Date.now()}`,
        code,
        name,
        module,
        description,
        status: "active",
        roleCount: 0,
        roles: [],
      };
    }

    const currentList = await this.getPermissions();
    this.setStorage("permissions_catalog", [created, ...currentList.filter((p) => p.code !== code)]);
    this.invalidateCache("permissions_catalog");

    await this.logActivity({
      actor: actor || DEFAULT_ADMIN_ACTOR,
      action: "PERMISSION_CREATE",
      module: "Phân quyền",
      target: `Mã quyền [${code}]`,
      description: `Khai báo mã quyền hạn mới [${code}] - "${name}" thuộc phân hệ "${module}".`,
      metadata: { code, name, module, description },
      severity: "success",
    });

    return created;
  }

  async updatePermission(
    id: string | number,
    data: { name: string; module: string; description: string },
    actor?: AdminAuditLog["actor"],
  ): Promise<void> {
    const currentList = await this.getPermissions();
    const existing = currentList.find((p) => String(p.id) === String(id));

    try {
      await rbacApi.updatePermission(id, data);
    } catch (e) {
      console.warn("Cập nhật quyền qua API thất bại, lưu cục bộ:", e);
    }

    const nextList = currentList.map((p) =>
      String(p.id) === String(id)
        ? { ...p, name: data.name, module: data.module, description: data.description }
        : p,
    );
    this.setStorage("permissions_catalog", nextList);
    this.invalidateCache("permissions_catalog");

    await this.logActivity({
      actor: actor || DEFAULT_ADMIN_ACTOR,
      action: "PERMISSION_UPDATE",
      module: "Phân quyền",
      target: `Mã quyền [${existing?.code || id}]`,
      description: `Cập nhật thông tin quyền hạn [${existing?.code || id}]: "${existing?.name}" → "${data.name}".`,
      metadata: {
        id,
        code: existing?.code,
        previousName: existing?.name,
        newName: data.name,
        module: data.module,
        description: data.description,
      },
      severity: "warning",
    });
  }

  async deletePermission(
    id: string | number,
    force = true,
    actor?: AdminAuditLog["actor"],
  ): Promise<void> {
    const currentList = await this.getPermissions();
    const existing = currentList.find((p) => String(p.id) === String(id));

    try {
      await rbacApi.deletePermission(id, force);
    } catch (e) {
      console.warn("Xóa quyền qua API thất bại, xóa cục bộ:", e);
    }

    this.setStorage(
      "permissions_catalog",
      currentList.filter((p) => String(p.id) !== String(id)),
    );
    this.invalidateCache("permissions_catalog");

    if (existing?.code) {
      const roles = await this.getRoles();
      this.setStorage(
        "roles",
        roles.map((r) => ({
          ...r,
          permissions: r.permissions.filter((k) => k !== existing.code),
        })),
      );
      this.invalidateCache("roles");
    }

    await this.logActivity({
      actor: actor || DEFAULT_ADMIN_ACTOR,
      action: "PERMISSION_DELETE",
      module: "Phân quyền",
      target: `Mã quyền [${existing?.code || id}]`,
      description: `Xóa mã quyền hạn [${existing?.code || id}] - "${existing?.name || ""}" khỏi hệ thống (force=${force}).`,
      metadata: {
        id,
        code: existing?.code,
        name: existing?.name,
        module: existing?.module,
      },
      severity: "danger",
    });
  }

  // ── 2. Categories & Collections ──
  async getCategories(includeDeleted = false, force = false): Promise<AdminCategory[]> {
    const key = `categories_${includeDeleted ? "all" : "active"}`;
    return this.fetchWithCache(
      key,
      3 * 60 * 1000,
      async () => {
        try {
          const apiCategories = await catalogApi.getCategories(includeDeleted);
          if (apiCategories && apiCategories.length > 0) {
            this.setStorage("categories", apiCategories);
            return apiCategories;
          }
        } catch (e) {
          console.warn("Lấy danh mục từ API thất bại, dùng dữ liệu dự phòng:", e);
        }
        const stored = this.getStorage<AdminCategory[]>("categories", INITIAL_CATEGORIES);
        return includeDeleted ? stored : stored.filter((c) => !c.isDeleted);
      },
      force
    );
  }

  async saveCategory(
    cat: Partial<AdminCategory>,
    imageFile?: File | null,
    actor?: AdminAuditLog["actor"],
  ): Promise<AdminCategory> {
    let saved: AdminCategory;
    try {
      saved = await catalogApi.saveCategory(cat, imageFile);
    } catch (e) {
      console.warn("Lưu danh mục qua API thất bại, lưu cục bộ:", e);
      const list = this.getStorage<AdminCategory[]>("categories", INITIAL_CATEGORIES);
      if (cat.id) {
        const idx = list.findIndex((c) => c.id === cat.id);
        saved = {
          ...(idx >= 0
            ? list[idx]
            : {
                id: cat.id,
                name: "",
                slug: "",
                parentId: null,
                order: 1,
                isDeleted: false,
                productCount: 0,
              }),
          ...cat,
        } as AdminCategory;
        if (idx >= 0) list[idx] = saved;
        else list.push(saved);
      } else {
        saved = {
          id: `cat-${Date.now()}`,
          name: cat.name || "Danh mục mới",
          slug: cat.slug || generateSlug(cat.name || "danh-muc"),
          parentId: cat.parentId ?? null,
          order: cat.order ?? list.length + 1,
          description: cat.description,
          imageUrl: cat.imageUrl,
          isCollection: cat.isCollection,
          isDeleted: false,
          productCount: 0,
        };
        list.push(saved);
      }
      this.setStorage("categories", list);
    }

    this.invalidateCache("categories");
    const isCollection = isCollectionCategory(saved) || isCollectionCategory(cat);
    const label = isCollection ? "Bộ sưu tập" : "Danh mục";

    await this.logActivity({
      actor: actor || DEFAULT_ADMIN_ACTOR,
      action: cat.id
        ? isCollection
          ? "COLLECTION_UPDATED"
          : "CATEGORY_UPDATED"
        : isCollection
          ? "COLLECTION_CREATED"
          : "CATEGORY_CREATED",
      module: label,
      target: `${label}: ${saved.name} (/${saved.slug})`,
      description: `${cat.id ? "Cập nhật thông tin" : "Tạo mới"} ${label.toLowerCase()} "${saved.name}" (/${saved.slug}).`,
      metadata: { category: saved, isCollection },
      severity: cat.id ? "info" : "success",
    });

    return saved;
  }

  async softDeleteCategory(id: string, actor?: AdminAuditLog["actor"]): Promise<void> {
    const allCats = await this.getCategories(true);
    const category = allCats.find((item) => item.id === id);

    try {
      await catalogApi.softDeleteCategory(id);
    } catch {
      try {
        await catalogApi.setCategoryActive(id, false);
      } catch (e) {
        console.warn("Ẩn danh mục qua API thất bại, cập nhật cục bộ:", e);
        this.setStorage(
          "categories",
          allCats.map((c) => (c.id === id ? { ...c, isDeleted: true } : c)),
        );
      }
    }
    this.invalidateCache("categories");

    if (category) {
      const isCollection = isCollectionCategory(category);
      const label = isCollection ? "Bộ sưu tập" : "Danh mục";
      await this.logActivity({
        actor: actor || DEFAULT_ADMIN_ACTOR,
        action: isCollection ? "COLLECTION_DELETED" : "CATEGORY_DELETED",
        module: label,
        target: `${label}: ${category.name}`,
        description: `Đưa ${label.toLowerCase()} "${category.name}" vào thùng rác.`,
        metadata: { categoryId: id, categoryName: category.name, isCollection },
        severity: "danger",
      });
    }
  }

  async restoreCategory(id: string, actor?: AdminAuditLog["actor"]): Promise<void> {
    const allCats = await this.getCategories(true);
    const category = allCats.find((item) => item.id === id);

    try {
      await catalogApi.restoreCategory(id);
    } catch {
      try {
        await catalogApi.setCategoryActive(id, true);
      } catch (e) {
        console.warn("Khôi phục danh mục qua API thất bại, cập nhật cục bộ:", e);
        this.setStorage(
          "categories",
          allCats.map((c) => (c.id === id ? { ...c, isDeleted: false } : c)),
        );
      }
    }
    this.invalidateCache("categories");

    if (category) {
      const isCollection = isCollectionCategory(category);
      const label = isCollection ? "Bộ sưu tập" : "Danh mục";
      await this.logActivity({
        actor: actor || DEFAULT_ADMIN_ACTOR,
        action: "CATEGORY_RESTORED",
        module: label,
        target: `${label}: ${category.name}`,
        description: `Khôi phục ${label.toLowerCase()} "${category.name}" từ thùng rác.`,
        metadata: { categoryId: id, categoryName: category.name, restored: true, isCollection },
        severity: "success",
      });
    }
  }

  // ── 3. Products & Variants ──
  async getProducts(includeDeleted = false, force = false): Promise<AdminProduct[]> {
    const key = `products_${includeDeleted ? "all" : "active"}`;
    return this.fetchWithCache(
      key,
      2 * 60 * 1000,
      async () => {
        try {
          const apiProducts = await catalogApi.getProducts(includeDeleted);
          if (apiProducts && apiProducts.length > 0) {
            this.setStorage("products", apiProducts);
            return apiProducts;
          }
          return apiProducts || [];
        } catch (e) {
          console.warn("Lấy danh sách sản phẩm từ API thất bại, dùng dữ liệu dự phòng:", e);
          const stored = this.getStorage<AdminProduct[]>("products", INITIAL_PRODUCTS);
          return includeDeleted ? stored : stored.filter((p) => !p.isDeleted);
        }
      },
      force
    );
  }

  async saveProduct(prod: AdminProductInput, actor?: AdminAuditLog["actor"]): Promise<AdminProduct> {
    const saved = await catalogApi.saveProduct(prod);
    this.invalidateCache("products");
    await this.logActivity({
      actor: actor || DEFAULT_ADMIN_ACTOR,
      action: prod.id ? "PRODUCT_UPDATED" : "PRODUCT_CREATED",
      module: "Sản phẩm",
      target: saved.name,
      description: prod.id ? "Cập nhật thông tin, giá hoặc biến thể sản phẩm." : "Tạo sản phẩm mới.",
      metadata: {
        productId: saved.id,
        productName: saved.name,
        category: saved.category,
        price: saved.price,
        variants: saved.variants,
      },
      severity: prod.id ? "info" : "success",
    });
    return saved;
  }

  async softDeleteProduct(id: number, actor?: AdminAuditLog["actor"]): Promise<void> {
    const product = (await this.getProducts(true)).find((item) => item.id === id);
    try {
      await catalogApi.softDeleteProduct(id);
    } catch {
      await catalogApi.setProductStatus(id, "ARCHIVED");
    }
    this.invalidateCache("products");
    if (product) {
      await this.logActivity({
        actor: actor || DEFAULT_ADMIN_ACTOR,
        action: "PRODUCT_DELETED",
        module: "Sản phẩm",
        target: product.name,
        description: "Đưa sản phẩm vào thùng rác.",
        metadata: { productId: id, productName: product.name },
        severity: "danger",
      });
    }
  }

  async restoreProduct(id: number, actor?: AdminAuditLog["actor"]): Promise<void> {
    const product = (await this.getProducts(true)).find((item) => item.id === id);
    try {
      await catalogApi.restoreProduct(id);
    } catch {
      await catalogApi.setProductStatus(id, product?.status === "draft" ? "DRAFT" : "ACTIVE");
    }
    this.invalidateCache("products");
    if (product) {
      await this.logActivity({
        actor: actor || DEFAULT_ADMIN_ACTOR,
        action: "PRODUCT_UPDATED",
        module: "Sản phẩm",
        target: product.name,
        description: "Khôi phục sản phẩm từ thùng rác.",
        metadata: { productId: id, productName: product.name, restored: true },
        severity: "info",
      });
    }
  }

  async restockProduct(id: number, amount: number, actor?: AdminAuditLog["actor"]): Promise<void> {
    const list = await this.getProducts(true);
    const product = list.find((item) => item.id === id);
    const oldStock = product?.stock || 0;
    const newStock = Math.max(0, oldStock + amount);

    if (product) {
      const updatedVariants = (product.variants || []).map((v) => ({
        ...v,
        stock: Math.max(0, v.stock + amount),
      }));
      try {
        await catalogApi.saveProduct({
          ...product,
          stock: newStock,
          variants: updatedVariants.length > 0 ? updatedVariants : undefined,
        });
      } catch (err) {
        console.warn("[adminService] Lỗi khi cập nhật tồn kho lên máy chủ:", err);
      }
    }

    const updated = list.map((p) =>
      p.id === id ? { ...p, stock: newStock, status: "active" as const } : p,
    );
    this.setStorage("products", updated);
    this.invalidateCache("products");

    if (product) {
      await this.logActivity({
        actor: actor || DEFAULT_ADMIN_ACTOR,
        action: "PRODUCT_RESTOCKED",
        module: "Sản phẩm",
        target: product.name,
        description: `Điều chỉnh tồn kho ${amount > 0 ? "tăng" : "giảm"} ${Math.abs(amount)} sản phẩm.`,
        metadata: {
          productId: id,
          productName: product.name,
          oldStock,
          newStock,
          quantityChanged: amount,
        },
        severity: amount >= 0 ? "success" : "warning",
      });
    }
  }

  // ── 4. Orders ──
  async getOrders(force = false): Promise<AdminOrder[]> {
    return this.fetchWithCache(
      "orders",
      30 * 1000,
      async () => {
        try {
          const orders = await orderApi.getOrders({ size: 100 });
          const deletedIds = new Set(this.getStorage<string[]>("orders_deleted", []));
          return orders.map((o) => ({
            ...o,
            isDeleted: deletedIds.has(String(o.id)),
          }));
        } catch (e) {
          console.error("Lấy danh sách đơn hàng từ API thất bại:", e);
          return [];
        }
      },
      force
    );
  }

  async getOrderDetail(id: string | number): Promise<AdminOrder> {
    return orderApi.getOrderDetail(id);
  }

  async createOrder(
    order: Omit<AdminOrder, "id" | "statusHistory">,
    actor: AdminAuditLog["actor"],
  ): Promise<AdminOrder> {
    let created: AdminOrder;
    try {
      created = await orderApi.createOrder(order);
    } catch (e) {
      console.warn("Lưu đơn hàng qua API thất bại, dùng bản ghi cục bộ:", e);
      const createdAt = new Date().toLocaleString("vi-VN");
      created = {
        ...order,
        id: `ord-${Date.now()}`,
        createdAt: order.createdAt || createdAt,
        status: order.status || "confirmed",
        paymentStatus: order.paymentStatus || "pending",
        statusHistory: [
          {
            id: `hist-${Date.now()}`,
            status: order.status || "confirmed",
            timestamp: createdAt,
            updatedBy: actor.name,
            note: order.note || `Tạo hóa đơn #${order.orderCode} bởi quản trị viên.`,
          },
        ],
      };
    }
    this.invalidateCache("orders");
    this.invalidateCache("audit_logs");

    void this.logActivity({
      actor,
      action: "ORDER_CREATED",
      module: "Đơn hàng",
      target: `Đơn hàng #${created.orderCode}`,
      description: `${actor.name} đặt ${created.items.length} dòng sản phẩm, tổng trị giá ${created.total.toLocaleString("vi-VN")}₫.`,
      metadata: {
        orderId: created.id,
        orderCode: created.orderCode,
        total: created.total,
        paymentMethod: created.paymentMethod,
        paymentStatus: created.paymentStatus,
        items: created.items.map(
          ({ productId, name, variantSku, variantDetails, price, quantity }) => ({
            productId,
            name,
            variantSku,
            variantDetails,
            price,
            quantity,
          }),
        ),
      },
      severity: "success",
    });

    if (created.paymentMethod !== "cod") {
      void this.logActivity({
        actor: { ...actor, role: "Khách hàng" },
        action: "PAYMENT_INITIATED",
        module: "Thanh toán",
        target: `Thanh toán đơn #${created.orderCode}`,
        description: `Khách hàng khởi tạo thanh toán ${created.total.toLocaleString("vi-VN")}₫ qua ${created.paymentMethod}; đang chờ cổng thanh toán xác nhận.`,
        metadata: {
          orderId: created.id,
          orderCode: created.orderCode,
          amount: created.total,
          paymentMethod: created.paymentMethod,
          status: "pending",
        },
        severity: "info",
      });
    }

    return created;
  }

  async updateOrderStatus(
    orderId: string,
    newStatus: AdminOrder["status"],
    updatedBy = "Quản trị viên",
    note?: string,
    actor?: AdminAuditLog["actor"],
  ): Promise<AdminOrder> {
    const updated = await orderApi.updateStatus(orderId, newStatus, note);
    this.invalidateCache("orders");
    this.invalidateCache("audit_logs");

    void this.logActivity({
      actor: actor || { name: updatedBy, role: "Nhân viên quản trị" },
      action: "ORDER_STATUS_CHANGED",
      module: "Đơn hàng",
      target: `Đơn hàng #${updated.orderCode}`,
      description: `Đổi trạng thái sang ${newStatus}${note ? `: ${note}` : ""}.`,
      metadata: { orderId, orderCode: updated.orderCode, newStatus, note },
      severity: newStatus === "cancelled" ? "warning" : "info",
    });

    return updated;
  }

  async deleteOrder(id: string, actor: AdminAuditLog["actor"]): Promise<void> {
    const deletedIds = this.getStorage<string[]>("orders_deleted", []);
    if (!deletedIds.includes(String(id))) {
      this.setStorage("orders_deleted", [...deletedIds, String(id)]);
    }
    this.invalidateCache("orders");
    this.invalidateCache("audit_logs");
    void this.logActivity({
      actor,
      action: "ORDER_SOFT_DELETED",
      module: "Đơn hàng",
      target: `Đơn hàng #${id}`,
      description: `Đưa đơn hàng #${id} vào thùng rác (xóa mềm).`,
      metadata: { orderId: id },
      severity: "warning",
    });
  }

  async restoreOrder(id: string, actor: AdminAuditLog["actor"]): Promise<void> {
    const deletedIds = this.getStorage<string[]>("orders_deleted", []);
    this.setStorage(
      "orders_deleted",
      deletedIds.filter((dId) => dId !== String(id)),
    );
    this.invalidateCache("orders");
    this.invalidateCache("audit_logs");
    void this.logActivity({
      actor,
      action: "ORDER_RESTORED",
      module: "Đơn hàng",
      target: `Đơn hàng #${id}`,
      description: `Khôi phục đơn hàng #${id} từ thùng rác.`,
      metadata: { orderId: id },
      severity: "info",
    });
  }

  async confirmOrderPayment(
    orderId: string,
    actor: AdminAuditLog["actor"],
    paymentStatus = "paid",
    paymentMethod?: string,
    note?: string,
  ): Promise<AdminOrder> {
    const updated = await orderApi.updatePaymentStatus(orderId, paymentStatus, paymentMethod, note);
    this.invalidateCache("orders");
    this.invalidateCache("audit_logs");

    void this.logActivity({
      actor,
      action: "PAYMENT_CONFIRMED",
      module: "Thanh toán",
      target: `Thanh toán đơn #${updated.orderCode}`,
      description: `Nhân viên cập nhật thanh toán đơn hàng (Trạng thái: ${paymentStatus.toUpperCase()}, Phương thức: ${(paymentMethod || updated.paymentMethod).toUpperCase()})${note ? `: ${note}` : ""}.`,
      metadata: {
        orderId,
        orderCode: updated.orderCode,
        amount: updated.total,
        paymentMethod: paymentMethod || updated.paymentMethod,
        paymentStatus,
        note,
      },
      severity: "success",
    });

    return updated;
  }

  async updateOrderShipping(
    orderId: string,
    data: {
      recipientName: string;
      recipientPhone: string;
      shippingAddress: string;
      customerNote?: string;
    },
    actor: AdminAuditLog["actor"],
  ): Promise<AdminOrder> {
    const updated = await orderApi.updateShippingInfo(orderId, data);
    this.invalidateCache("orders");
    this.invalidateCache("audit_logs");
    void this.logActivity({
      actor,
      action: "ORDER_STATUS_CHANGED",
      module: "Đơn hàng",
      target: `Đơn hàng #${updated.orderCode}`,
      description: `Cập nhật thông tin giao hàng: Người nhận: ${data.recipientName}, SĐT: ${data.recipientPhone}, Đ/C: ${data.shippingAddress}`,
      metadata: { orderId, orderCode: updated.orderCode, ...data },
      severity: "info",
    });
    return updated;
  }

  async cancelOrder(
    orderId: string,
    reason: string,
    actor: AdminAuditLog["actor"],
  ): Promise<AdminOrder> {
    const updated = await orderApi.cancelOrder(orderId, reason);
    this.invalidateCache("orders");
    this.invalidateCache("audit_logs");
    void this.logActivity({
      actor,
      action: "ORDER_STATUS_CHANGED",
      module: "Đơn hàng",
      target: `Đơn hàng #${updated.orderCode}`,
      description: `Hủy đơn hàng #${updated.orderCode}. Lý do: ${reason}`,
      metadata: { orderId, orderCode: updated.orderCode, reason },
      severity: "warning",
    });
    return updated;
  }

  // ── 5. Staff ──
  async getStaff(force = false): Promise<AdminStaff[]> {
    return this.fetchWithCache(
      "staff",
      3 * 60 * 1000,
      async () => {
        try {
          const list = await rbacApi.getStaff();
          if (list && list.length > 0) {
            this.setStorage("staff", list);
            return list;
          }
        } catch (e) {
          console.warn("Lấy nhân sự từ API thất bại, trả về danh sách rỗng:", e);
        }
        return this.getStorage<AdminStaff[]>("staff", []);
      },
      force
    );
  }

  async saveStaff(
    staff: Partial<AdminStaff> & { username?: string; password?: string; phone?: string },
    actor?: AdminAuditLog["actor"],
  ): Promise<void> {
    const currentList = await this.getStaff();
    if (staff.id && staff.roleCode) {
      const existing = currentList.find((s) => s.id === staff.id);
      const previousRole = existing?.roleCode || "STAFF";
      try {
        await rbacApi.updateUserRoles(staff.id, [staff.roleCode]);
      } catch (e) {
        console.warn("Gán vai trò nhân sự qua API thất bại, lưu cục bộ:", e);
      }

      const updatedList = currentList.map((s) =>
        s.id === staff.id
          ? {
              ...s,
              roleCode: staff.roleCode!,
              roleName: staff.roleName || staff.roleCode!,
            }
          : s,
      );
      this.setStorage("staff", updatedList);
      this.invalidateCache("staff");

      await this.logActivity({
        actor: actor || DEFAULT_ADMIN_ACTOR,
        action: "ASSIGN_ROLES",
        module: "Phân quyền",
        target: `${existing?.name || staff.name || "Nhân sự"} (${existing?.email || staff.email || `#${staff.id}`})`,
        description: `Phân công lại vai trò cho nhân sự ${existing?.name || staff.name || `#${staff.id}`}: [${previousRole}] → [${staff.roleCode}] (${staff.roleName || staff.roleCode}).`,
        metadata: {
          staffId: staff.id,
          staffName: existing?.name || staff.name,
          email: existing?.email || staff.email,
          previousRoles: [previousRole],
          newRoles: [staff.roleCode],
          roleCode: staff.roleCode,
        },
        severity: "warning",
      });
      return;
    }

    const username =
      staff.username?.trim() || staff.email?.split("@")[0] || `staff_${Date.now()}`;
    const roleCode = staff.roleCode || "STAFF";
    let created: AdminStaff;

    try {
      created = await rbacApi.createStaff({
        username,
        password: staff.password,
        fullName: staff.name || "Nhân viên mới",
        email: staff.email || `${username}@nhaxinh.com`,
        phone: staff.phone,
        roleCode,
      });
    } catch (e) {
      console.warn("Tạo nhân sự qua API thất bại, lưu cục bộ:", e);
      created = {
        id: `staff-${Date.now()}`,
        username,
        name: staff.name || "Nhân viên mới",
        email: staff.email || `${username}@nhaxinh.com`,
        phone: staff.phone,
        roleCode,
        roleName: staff.roleName || roleCode,
        status: "active",
        lastLogin: "Vừa khởi tạo",
      };
    }

    this.setStorage("staff", [created, ...currentList]);
    this.invalidateCache("staff");

    await this.logActivity({
      actor: actor || DEFAULT_ADMIN_ACTOR,
      action: "STAFF_INVITED",
      module: "Phân quyền",
      target: `${created.name} (${created.email})`,
      description: `Tạo mới tài khoản nhân sự nội bộ @${username} (${created.email}) và gán vai trò [${roleCode}].`,
      metadata: {
        staffId: created.id,
        username,
        fullName: created.name,
        email: created.email,
        phone: created.phone,
        assignedRoles: [roleCode],
        roleCode,
      },
      severity: "success",
    });
  }

  async updateStaffStatus(
    userId: string,
    status: "active" | "inactive",
    actorOrNote?: AdminAuditLog["actor"] | string,
    actorArg?: AdminAuditLog["actor"],
  ): Promise<void> {
    const resolvedActor =
      typeof actorOrNote === "object" && actorOrNote !== null
        ? actorOrNote
        : actorArg || DEFAULT_ADMIN_ACTOR;
    const note = typeof actorOrNote === "string" ? actorOrNote : undefined;

    const currentList = await this.getStaff();
    const existing = currentList.find((s) => s.id === userId);
    const previousStatus = existing?.status || (status === "active" ? "inactive" : "active");

    try {
      await rbacApi.updateUserStatus(userId, status === "active" ? "ACTIVE" : "INACTIVE");
    } catch (e) {
      console.warn("Đổi trạng thái nhân sự qua API thất bại, cập nhật cục bộ:", e);
    }

    this.setStorage(
      "staff",
      currentList.map((s) => (s.id === userId ? { ...s, status } : s)),
    );
    this.invalidateCache("staff");

    await this.logActivity({
      actor: resolvedActor,
      action: "USER_STATUS_UPDATE",
      module: "Phân quyền",
      target: `${existing?.name || `Tài khoản #${userId}`} (${existing?.email || userId})`,
      description:
        status === "active"
          ? `Mở khóa tài khoản nhân sự ${existing?.name || `#${userId}`} (${previousStatus.toUpperCase()} → ACTIVE).`
          : `Tạm khóa tài khoản nhân sự ${existing?.name || `#${userId}`} (${previousStatus.toUpperCase()} → INACTIVE).`,
      metadata: {
        userId,
        staffName: existing?.name,
        email: existing?.email,
        previousStatus: previousStatus.toUpperCase(),
        newStatus: status === "active" ? "ACTIVE" : "INACTIVE",
        note,
      },
      severity: status === "active" ? "success" : "danger",
    });
  }

  // ── 6. Discounts (Coupons) ──
  async getDiscounts(force = false): Promise<AdminDiscount[]> {
    return this.fetchWithCache(
      "discounts",
      3 * 60 * 1000,
      async () => {
        try {
          return await couponApi.getDiscounts();
        } catch (e) {
          console.warn("[AdminService] Không thể tải danh sách giảm giá từ API:", e);
          return INITIAL_DISCOUNTS;
        }
      },
      force
    );
  }

  async saveDiscount(disc: Partial<AdminDiscount>): Promise<AdminDiscount> {
    const saved = await couponApi.saveDiscount(disc);
    this.invalidateCache("discounts");
    return saved;
  }

  async deleteDiscount(id: string): Promise<void> {
    await couponApi.deleteDiscount(id);
    this.invalidateCache("discounts");
  }

  // ── 7. Articles ──
  async getArticles(force = false): Promise<AdminArticle[]> {
    return this.fetchWithCache(
      "articles",
      3 * 60 * 1000,
      async () => {
        try {
          const serverArticles = await articleService.getAdminArticles();
          if (serverArticles && serverArticles.length > 0) {
            this.setStorage("articles", serverArticles);
            return serverArticles;
          }
        } catch {
          // Fallback nếu máy chủ mất kết nối
        }
        return this.getStorage<AdminArticle[]>("articles", INITIAL_ARTICLES);
      },
      force
    );
  }

  async saveArticle(art: Partial<AdminArticle>): Promise<AdminArticle> {
    try {
      if (art.id && !String(art.id).startsWith("art-")) {
        const updated = await articleService.updateArticle(art.id, art);
        if (updated) {
          this.invalidateCache("articles");
          return updated;
        }
      } else {
        const created = await articleService.createArticle(art);
        if (created) {
          this.invalidateCache("articles");
          return created;
        }
      }
    } catch (err) {
      console.warn("[adminService] Không thể lưu bài viết lên server, lưu tạm vào bộ nhớ:", err);
    }

    const list = await this.getArticles();
    if (art.id) {
      const idx = list.findIndex((a) => a.id === art.id);
      if (idx >= 0) {
        list[idx] = { ...list[idx], ...art };
        this.setStorage("articles", list);
        this.invalidateCache("articles");
        return list[idx];
      }
    }

    const newArt: AdminArticle = {
      id: `art-${Date.now()}`,
      title: art.title || "",
      slug: art.slug || generateSlug(art.title || "bai-viet"),
      category: art.category || "Góc cảm hứng",
      collectionSlug: art.collectionSlug,
      author: art.author || "Ban Biên Tập",
      views: 1,
      createdAt: new Date().toLocaleDateString("vi-VN"),
      status: "published",
      image: art.image || DEFAULT_PLACEHOLDER_IMAGE,
      summary: art.summary || "",
      content: art.content || "",
    };
    list.unshift(newArt);
    this.setStorage("articles", list);
    this.invalidateCache("articles");
    return newArt;
  }

  async deleteArticle(id: string): Promise<void> {
    try {
      if (!id.startsWith("art-")) {
        await articleService.deleteArticle(id);
      }
    } catch (err) {
      console.warn("[adminService] Lỗi xóa bài viết trên server:", err);
    }
    const list = await this.getArticles();
    this.setStorage(
      "articles",
      list.map((a) => (a.id === id ? { ...a, isDeleted: true } : a)),
    );
    this.invalidateCache("articles");
  }

  async restoreArticle(id: string): Promise<void> {
    try {
      if (!id.startsWith("art-")) {
        await articleService.restoreArticle(id);
      }
    } catch (err) {
      console.warn("[adminService] Lỗi khôi phục bài viết trên server:", err);
    }
    const list = await this.getArticles();
    this.setStorage(
      "articles",
      list.map((a) => (a.id === id ? { ...a, isDeleted: false } : a)),
    );
    this.invalidateCache("articles");
  }

  async toggleArticleStatus(
    id: string,
    status?: "published" | "hidden",
  ): Promise<AdminArticle | null> {
    try {
      if (!id.startsWith("art-")) {
        const updated = await articleService.toggleArticleStatus(id, status);
        if (updated) {
          this.invalidateCache("articles");
          return updated;
        }
      }
    } catch (err) {
      console.warn("[adminService] Lỗi cập nhật trạng thái bài viết:", err);
    }
    const list = await this.getArticles();
    const idx = list.findIndex((a) => a.id === id);
    if (idx >= 0) {
      const nextStatus = status || (list[idx].status === "hidden" ? "published" : "hidden");
      list[idx] = { ...list[idx], status: nextStatus };
      this.setStorage("articles", list);
      this.invalidateCache("articles");
      return list[idx];
    }
    return null;
  }

  // ── 8. Notifications ──
  async getNotifications(force = false): Promise<AdminNotification[]> {
    return this.fetchWithCache(
      "notifications",
      45 * 1000,
      async () => {
        return this.getStorage<AdminNotification[]>("notifications", INITIAL_NOTIFICATIONS);
      },
      force
    );
  }

  async createNotification(notif: Partial<AdminNotification>): Promise<AdminNotification> {
    const list = await this.getNotifications();
    const newN: AdminNotification = {
      id: `notif-${Date.now()}`,
      title: notif.title || "",
      message: notif.message || "",
      type: notif.type || "system",
      createdAt: "Vừa xong",
      target: notif.target || "all",
      read: false,
    };
    list.unshift(newN);
    this.setStorage("notifications", list);
    this.invalidateCache("notifications");
    return newN;
  }

  async markNotificationRead(id: string): Promise<void> {
    const list = await this.getNotifications();
    this.setStorage(
      "notifications",
      list.map((n) => (n.id === id ? { ...n, read: true } : n)),
    );
    this.invalidateCache("notifications");
  }

  async markAllNotificationsRead(): Promise<void> {
    const list = await this.getNotifications();
    this.setStorage(
      "notifications",
      list.map((n) => ({ ...n, read: true })),
    );
    this.invalidateCache("notifications");
  }

  // ── 9. Tickets ──
  async getTickets(force = false): Promise<AdminTicket[]> {
    return this.fetchWithCache(
      "tickets",
      60 * 1000,
      async () => {
        return this.getStorage<AdminTicket[]>("tickets", INITIAL_TICKETS);
      },
      force
    );
  }

  async replyTicket(id: string, replyText: string): Promise<void> {
    const list = await this.getTickets();
    const idx = list.findIndex((t) => t.id === id);
    if (idx >= 0) {
      list[idx] = { ...list[idx], reply: replyText, status: "resolved" };
      this.setStorage("tickets", list);
      this.invalidateCache("tickets");
    }
  }

  // ── 10. Settings ──
  async getSettings(force = false): Promise<AdminSettingsConfig> {
    return this.fetchWithCache(
      "settings",
      5 * 60 * 1000,
      async () => {
        return this.getStorage<AdminSettingsConfig>("settings", INITIAL_SETTINGS);
      },
      force
    );
  }

  async saveSettings(cfg: AdminSettingsConfig, actor?: AdminAuditLog["actor"]): Promise<void> {
    const previous = await this.getSettings();
    this.setStorage("settings", cfg);
    this.invalidateCache("settings");
    await this.logActivity({
      actor: actor || DEFAULT_ADMIN_ACTOR,
      action: "SETTINGS_CHANGED",
      module: "Hệ thống",
      target: "Cấu hình hệ thống",
      description: "Cập nhật thông tin vận hành, vận chuyển hoặc cổng thanh toán.",
      metadata: { before: previous, after: cfg },
      severity: "warning",
    });
  }

  // ── 11. Audit Logs ──
  async getAuditLogs(force = false): Promise<AdminAuditLog[]> {
    return this.fetchWithCache(
      "audit_logs",
      30 * 1000,
      async () => {
        const localLogs = this.getStorage<AdminAuditLog[]>("logs", INITIAL_AUDIT_LOGS);
        try {
          const apiLogs = await rbacApi.getAuditLogs();
          if (apiLogs && apiLogs.length > 0) {
            const seenIds = new Set(apiLogs.map((l) => l.id));
            const uniqueLocal = localLogs.filter((l) => !seenIds.has(l.id));
            return [...uniqueLocal, ...apiLogs];
          }
        } catch (e) {
          console.warn("Lấy audit logs từ API thất bại, dùng nhật ký cục bộ:", e);
        }
        return localLogs;
      },
      force
    );
  }

  async logActivity(entry: Omit<AdminAuditLog, "id" | "timestamp">): Promise<AdminAuditLog> {
    const localLogs = this.getStorage<AdminAuditLog[]>("logs", INITIAL_AUDIT_LOGS);
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    const formattedTimestamp = `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

    const newLog: AdminAuditLog = {
      id: `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: formattedTimestamp,
      ipAddress: "127.0.0.1 (Nội bộ)",
      ...entry,
    };

    this.setStorage("logs", [newLog, ...localLogs].slice(0, 500));
    this.invalidateCache("audit_logs");

    void rbacApi
      .createAuditLog({
        action: String(entry.action),
        entityType: AUDIT_ENTITY_TYPE_MAP[entry.module] || "SYSTEM",
        entityId: String(
          entry.metadata?.roleId ||
            entry.metadata?.staffId ||
            entry.metadata?.userId ||
            entry.metadata?.categoryId ||
            entry.metadata?.productId ||
            entry.metadata?.orderId ||
            "",
        ),
        target: entry.target,
        description: entry.description,
        metadata: entry.metadata,
      })
      .catch(() => {
        // Bỏ qua nếu chưa có phiên session cookie phía server hoặc endpoint đã tự ghi log
      });

    return newLog;
  }

  async logAction(
    action: string,
    description: string,
    metadata?: Record<string, unknown>,
  ): Promise<AdminAuditLog> {
    return this.logActivity({
      actor: {
        name: "Admin",
        email: "admin@nhaxinh.com",
        role: "Quản trị viên",
      },
      action: action as AdminAuditLog["action"],
      module: "Hệ thống",
      target: "Chính sách website",
      description,
      metadata,
      severity: "info",
    });
  }

  async clearAuditLogs(): Promise<void> {
    this.setStorage("logs", []);
  }
}


export const adminApi = new AdminApiService();
export const adminService = adminApi;
