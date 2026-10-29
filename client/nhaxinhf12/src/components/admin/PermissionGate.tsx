import React from "react";
import type { PermissionKey, RoleDefinition } from "../../services/admin/types";

interface PermissionGateProps {
  permission: PermissionKey;
  currentRole: RoleDefinition;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  fallbackMessage?: string;
  hideIfNoPermission?: boolean;
}

const PERMISSION_ALIASES: Record<string, string[]> = {
  // Products
  "products.edit": ["products.update", "catalog:update"],
  "products.update": ["products.edit", "catalog:update"],
  "products.view": ["catalog:read"],
  "catalog:read": ["products.view"],
  "products.create": ["catalog:create"],
  "catalog:create": ["products.create"],
  "products.delete": ["catalog:delete"],
  "catalog:delete": ["products.delete"],
  "products.export": ["products.view", "catalog:read"],
  "products.restock": ["inventory.manage"],

  // Categories
  "categories.view": ["categories.manage"],
  "categories.create": ["categories.manage"],
  "categories.edit": ["categories.manage"],
  "categories.delete": ["categories.manage"],

  // Orders
  "orders.view": ["order:read"],
  "order:read": ["orders.view"],
  "orders.create": ["orders.update", "order:update"],
  "orders.update": ["order:update"],
  "order:update": ["orders.update"],
  "orders.cancel": ["order:cancel"],
  "order:cancel": ["orders.cancel"],
  "orders.export": ["orders.view", "order:read"],
  "orders.assign": ["orders.update", "order:update"],

  // Payments
  "payments.confirm": ["payments.view"],

  // Discounts & Coupons
  "discounts.view": ["coupons.manage"],
  "discounts.create": ["coupons.manage"],
  "discounts.edit": ["coupons.manage"],
  "discounts.delete": ["coupons.manage"],

  // Policies
  "policies.view": ["policies.manage", "policy:read"],
  "policies.edit": ["policies.manage", "policy:write"],
  "policy:read": ["policies.manage", "policies.view"],
  "policy:write": ["policies.manage", "policies.edit"],

  // Customers & CRM
  "crm.view": ["customers.view", "customers.care"],
  "crm.edit": ["customers.care"],
  "crm.delete": ["customers.care"],
  "customers.edit": ["customers.care"],

  // Notifications
  "notifications.view": ["email_logs.view"],
  "notifications.create": ["email_logs.view"],

  // Roles & Permissions & Staff Users
  "roles.view": ["roles.manage", "user:read", "user:manage"],
  "roles.create": ["roles.manage", "user:manage"],
  "roles.edit": ["roles.manage", "user:manage"],
  "roles.delete": ["roles.manage", "user:manage"],
  "users.view": ["user:read", "user:manage", "roles.manage"],
  "users.create": ["user:manage", "roles.manage"],
  "users.update": ["user:manage", "roles.manage"],
  "users.disable": ["user:manage", "roles.manage"],
  "user:manage": ["roles.manage", "users.update", "users.create"],

  // Logs & Audit
  "logs.view": ["audit_logs.view"],
  "logs.export": ["audit_logs.view"],
  "logs.clear": ["audit_logs.view"],

  // Settings & Articles
  "settings.view": ["dashboard.view"],
  "settings.edit": ["dashboard.view"],
  "articles.view": ["dashboard.view"],
  "articles.create": ["dashboard.view"],
  "articles.edit": ["dashboard.view"],
  "articles.delete": ["dashboard.view"],
};

export function hasPermission(role: RoleDefinition | null | undefined, permission: PermissionKey): boolean {
  if (!role) return false;
  if (role.code === "SUPER_ADMIN" || role.code === "ADMIN") return true;
  if (role.permissions?.includes(permission)) return true;

  const aliases = PERMISSION_ALIASES[permission];
  if (aliases && aliases.some((a) => (role.permissions as string[])?.includes(a))) {
    return true;
  }
  return false;
}

export default function PermissionGate({
  permission,
  currentRole,
  children,
  fallback = null,
  fallbackMessage,
  hideIfNoPermission = true,
}: PermissionGateProps) {
  const allowed = hasPermission(currentRole, permission);

  if (allowed) {
    return <>{children}</>;
  }

  if (hideIfNoPermission) {
    if (fallback) return <>{fallback}</>;
    if (fallbackMessage) {
      return (
        <div className="p-6 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl text-sm flex items-center justify-center font-medium">
          {fallbackMessage}
        </div>
      );
    }
    return null;
  }

  return (
    <div style={{ opacity: 0.5, pointerEvents: "none", filter: "grayscale(1)" }} title="Bạn không có quyền thực hiện chức năng này">
      {children}
    </div>
  );
}
