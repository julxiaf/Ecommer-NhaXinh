import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import Header from "../components/Headers";
import Footer from "../components/Footer";
import { useStore } from "../hooks/useStore";
import { usePolicies } from "../hooks/usePolicies";
import PolicySidebar from "../components/policies/PolicySidebar";
import PolicyArticle from "../components/policies/PolicyArticle";
import PolicySkeleton from "../components/policies/PolicySkeleton";
import PolicyEmptyState from "../components/policies/PolicyEmptyState";
import {
  getPolicyRoute as getPolicyPath,
  matchPolicyByPath as matchPolicy,
  type PolicyItem,
  type DynamicPolicy,
} from "../services/policies";
import "./policies.css";

// Re-export types và helpers cho tương thích ngược
export type { PolicyItem, DynamicPolicy };
export { getPolicyPath, matchPolicy };

export default function PolicyPage() {
  const { cartCount, wishlist, user } = useStore();
  const {
    policies,
    selectedPolicy,
    loading,
    error,
    reload,
    setSelectedPolicy,
  } = usePolicies();

  const currentTitle = selectedPolicy?.shortTitle || selectedPolicy?.title || "Chính sách";

  return (
    <>
      <Header user={user} cartCount={cartCount} wishlistCount={wishlist.length} />

      <main className="policy-page page-enter">
        <div className="policy-container" style={{ maxWidth: 1180, margin: "0 auto", padding: "0 16px" }}>
          {/* Breadcrumb Navigation */}
          <nav className="breadcrumb" aria-label="Breadcrumb" style={{ marginBottom: 24 }}>
            <Link to="/">Trang chủ</Link>
            <ChevronRight size={14} />
            <span>Hỗ trợ & Chính sách</span>
            <ChevronRight size={14} />
            <strong>{currentTitle}</strong>
          </nav>

          {/* 1. Trạng thái Loading Shimmer */}
          {loading ? (
            <PolicySkeleton />
          ) : error || policies.length === 0 || !selectedPolicy ? (
            /* 2. Trạng thái Trống hoặc Lỗi máy chủ (Không dùng Mock Data) */
            <PolicyEmptyState message={error} onRetry={reload} />
          ) : (
            /* 3. Bố cục Chính sách thực tế từ Máy chủ Nhà Xinh */
            <div className="policy-layout">
              <PolicySidebar
                policies={policies}
                selectedPolicy={selectedPolicy}
                onSelectPolicy={setSelectedPolicy}
              />
              <PolicyArticle policy={selectedPolicy} />
            </div>
          )}
        </div>
      </main>

      <Footer />
    </>
  );
}
