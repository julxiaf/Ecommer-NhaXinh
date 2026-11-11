/**
 * catalogApi.ts
 * Facade tổng hợp API quản trị danh mục (Category) và sản phẩm (Product).
 * Đã refactor tách biệt thành 2 module chuyên trách theo đúng nghiệp vụ:
 * - categoryAdminApi: Quản trị danh mục, không gian phòng, bộ sưu tập
 * - productAdminApi: Quản trị sản phẩm, biến thể, media 3D/hình ảnh
 */

import { categoryAdminApi } from "./categoryAdminApi";
import { productAdminApi } from "./productAdminApi";

export * from "./adminHttp";
export * from "./categoryAdminApi";
export * from "./productAdminApi";

// Re-export collection metadata helpers từ categoryService để đảm bảo 100% tương thích ngược
export {
  parseCollectionMeta,
  serializeCollectionMeta,
  isCollectionCategory,
  type CollectionMetadata,
} from "../categoryService";

export const catalogApi = {
  ...categoryAdminApi,
  ...productAdminApi,
};
