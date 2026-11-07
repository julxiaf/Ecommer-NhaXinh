import { useState, useEffect, useCallback } from "react";
import { useLocation, useParams } from "react-router-dom";
import {
  fetchPublishedPolicies,
  matchPolicyByPath,
  type PolicyItem,
} from "../services/policies";

export interface UsePoliciesResult {
  policies: PolicyItem[];
  selectedPolicy: PolicyItem | null;
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
  setSelectedPolicy: (policy: PolicyItem) => void;
}

export function usePolicies(): UsePoliciesResult {
  const location = useLocation();
  const { slug: routeSlug } = useParams<{ slug?: string }>();

  const [policies, setPolicies] = useState<PolicyItem[]>([]);
  const [selectedPolicy, setSelectedPolicy] = useState<PolicyItem | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // 1. Tải toàn bộ chính sách đã xuất bản (PUBLISHED) trực tiếp từ máy chủ
      const published = await fetchPublishedPolicies();

      if (!published || published.length === 0) {
        setPolicies([]);
        setSelectedPolicy(null);
        setError("Hiện chưa có chính sách nào được xuất bản.");
        return;
      }

      setPolicies(published);

      // 2. Tự động chọn chính sách khớp với URL hiện tại
      const current = matchPolicyByPath(published, location.pathname, routeSlug);
      setSelectedPolicy(current);
    } catch (err) {
      console.error("[usePolicies] Lỗi tải chính sách từ máy chủ:", err);
      const msg =
        err instanceof Error
          ? err.message
          : "Không thể kết nối đến máy chủ để tải chính sách. Vui lòng thử lại sau.";
      setError(msg);
      setPolicies([]);
      setSelectedPolicy(null);
    } finally {
      setLoading(false);
    }
  }, [location.pathname, routeSlug]);

  useEffect(() => {
    let ignore = false;

    fetchPublishedPolicies()
      .then((published) => {
        if (ignore) return;
        if (!published || published.length === 0) {
          setPolicies([]);
          setSelectedPolicy(null);
          setError("Hiện chưa có chính sách nào được xuất bản.");
        } else {
          setPolicies(published);
          const current = matchPolicyByPath(published, location.pathname, routeSlug);
          setSelectedPolicy(current);
          setError(null);
        }
      })
      .catch((err) => {
        if (ignore) return;
        console.error("[usePolicies] Lỗi kết nối:", err);
        setError(
          err instanceof Error
            ? err.message
            : "Không thể kết nối đến máy chủ để tải danh sách chính sách."
        );
        setPolicies([]);
        setSelectedPolicy(null);
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, []);

  // Khi URL thay đổi (pathname hoặc slug), tự động cập nhật chính sách được chọn
  useEffect(() => {
    if (policies.length > 0) {
      const current = matchPolicyByPath(policies, location.pathname, routeSlug);
      if (current) {
        setSelectedPolicy(current);
      }
    }
  }, [location.pathname, routeSlug, policies]);

  return {
    policies,
    selectedPolicy,
    loading,
    error,
    reload: loadData,
    setSelectedPolicy,
  };
}

