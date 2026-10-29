import { useEffect, useState, type FormEvent } from "react";
import {
  fetchAdminSession,
  fetchPolicyPage,
  savePolicyPage,
  signInAdmin,
  signOutAdmin,
  type PolicyPageContent,
} from "../services/policies";
import "./policies.css";

type EditablePolicy = Pick<
  PolicyPageContent,
  "title" | "introduction" | "purchasePolicy" | "returnPolicy"
>;

const emptyPolicy: EditablePolicy = {
  title: "",
  introduction: "",
  purchasePolicy: "",
  returnPolicy: "",
};

export default function AdminPoliciesPage() {
  const [authenticated, setAuthenticated] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [content, setContent] = useState<EditablePolicy>(emptyPolicy);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let cancelled = false;
    const loadAdmin = async () => {
      try {
        const session = await fetchAdminSession();
        if (cancelled || !session.authenticated) return;
        setAuthenticated(true);
        const policy = await fetchPolicyPage();
        if (!cancelled) {
          setContent({
            title: policy.title,
            introduction: policy.introduction,
            purchasePolicy: policy.purchasePolicy,
            returnPolicy: policy.returnPolicy,
          });
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Không thể kết nối máy chủ.");
        }
      } finally {
        if (!cancelled) setCheckingSession(false);
      }
    };
    void loadAdmin();
    return () => {
      cancelled = true;
    };
  }, []);

  const updateField = (field: keyof EditablePolicy, value: string) => {
    setContent((current) => ({ ...current, [field]: value }));
  };

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await signInAdmin(username, password);
      setAuthenticated(true);
      const policy = await fetchPolicyPage();
      setContent({
        title: policy.title,
        introduction: policy.introduction,
        purchasePolicy: policy.purchasePolicy,
        returnPolicy: policy.returnPolicy,
      });
      setPassword("");
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : "Đăng nhập không thành công.");
    } finally {
      setBusy(false);
    }
  };

  const handleSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const saved = await savePolicyPage(content);
      setContent({
        title: saved.title,
        introduction: saved.introduction,
        purchasePolicy: saved.purchasePolicy,
        returnPolicy: saved.returnPolicy,
      });
      setNotice("Đã lưu chính sách. Nội dung trên trang khách hàng đã được cập nhật.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Không thể lưu nội dung.");
    } finally {
      setBusy(false);
    }
  };

  const handleLogout = async () => {
    setBusy(true);
    setError("");
    try {
      await signOutAdmin();
      setAuthenticated(false);
      setContent(emptyPolicy);
    } catch (logoutError) {
      setError(logoutError instanceof Error ? logoutError.message : "Không thể đăng xuất.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="policy-admin-page">
      <section className="policy-admin-card">
        <p className="policy-eyebrow">NHÀ XINH · QUẢN TRỊ NỘI DUNG</p>
        <h1>Chính sách mua bán, đổi trả</h1>
        {checkingSession && <p role="status">Đang kiểm tra phiên đăng nhập...</p>}
        {error && <p className="policy-feedback error" role="alert">{error}</p>}
        {notice && <p className="policy-feedback success" role="status">{notice}</p>}

        {!checkingSession && !authenticated && (
          <form className="policy-form" onSubmit={(event) => void handleLogin(event)}>
            <label>
              Tên đăng nhập admin
              <input
                autoComplete="username"
                required
                value={username}
                onChange={(event) => setUsername(event.target.value)}
              />
            </label>
            <label>
              Mật khẩu
              <input
                autoComplete="current-password"
                required
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </label>
            <button className="policy-button" type="submit" disabled={busy}>
              {busy ? "Đang đăng nhập..." : "Đăng nhập"}
            </button>
          </form>
        )}

        {!checkingSession && authenticated && (
          <form className="policy-form" onSubmit={(event) => void handleSave(event)}>
            <label>
              Tiêu đề trang
              <input
                required
                value={content.title}
                onChange={(event) => updateField("title", event.target.value)}
              />
            </label>
            <label>
              Lời giới thiệu
              <textarea
                required
                rows={3}
                value={content.introduction}
                onChange={(event) => updateField("introduction", event.target.value)}
              />
            </label>
            <label>
              Nội dung chính sách mua hàng
              <textarea
                required
                rows={8}
                value={content.purchasePolicy}
                onChange={(event) => updateField("purchasePolicy", event.target.value)}
              />
            </label>
            <label>
              Nội dung chính sách trả và đổi hàng
              <textarea
                required
                rows={14}
                value={content.returnPolicy}
                onChange={(event) => updateField("returnPolicy", event.target.value)}
              />
            </label>
            <div className="policy-admin-actions">
              <button className="policy-button" type="submit" disabled={busy}>
                {busy ? "Đang lưu..." : "Lưu nội dung"}
              </button>
              <button
                className="policy-button secondary"
                type="button"
                disabled={busy}
                onClick={() => void handleLogout()}
              >
                Đăng xuất
              </button>
            </div>
          </form>
        )}
      </section>
    </main>
  );
}
