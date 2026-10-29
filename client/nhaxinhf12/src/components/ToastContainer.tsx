import type { Toast } from "../hooks/useAnimations";
import { ShoppingBag, CheckCircle, AlertCircle } from "lucide-react";

interface ToastContainerProps {
  toasts: Toast[];
}

export default function ToastContainer({ toasts }: ToastContainerProps) {
  if (toasts.length === 0) return null;

  return (
    <div className="toast-container">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`toast ${t.type === "success" ? "toast-success" : t.type === "error" ? "toast-error" : ""} ${t.exiting ? "exiting" : ""}`}
        >
          {t.type === "success" && <CheckCircle size={18} />}
          {t.type === "error" && <AlertCircle size={18} />}
          {t.type === "info" && <ShoppingBag size={18} />}
          {t.message}
        </div>
      ))}
    </div>
  );
}
