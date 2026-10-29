import { useEffect, useRef, useCallback, useState } from "react";

/**
 * Hook: Scroll reveal – thêm class "visible" khi element vào viewport.
 * Dùng với className "reveal", "reveal-left", "reveal-right", "reveal-scale".
 */
export function useScrollReveal() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -40px 0px" }
    );

    // Observe the element and all children with reveal classes
    const targets = el.querySelectorAll(".reveal, .reveal-left, .reveal-right, .reveal-scale");
    targets.forEach((t) => observer.observe(t));
    if (el.classList.contains("reveal") || el.classList.contains("reveal-left") ||
        el.classList.contains("reveal-right") || el.classList.contains("reveal-scale")) {
      observer.observe(el);
    }

    return () => observer.disconnect();
  }, []);

  return ref;
}

/**
 * Hook: Toast notifications
 */
export interface Toast {
  id: number;
  message: string;
  type: "success" | "error" | "info";
  exiting?: boolean;
}

let toastIdCounter = 0;

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: Toast["type"] = "success") => {
    const id = ++toastIdCounter;
    setToasts((prev) => [...prev, { id, message, type }]);

    // Auto-dismiss after 3s
    setTimeout(() => {
      setToasts((prev) =>
        prev.map((t) => (t.id === id ? { ...t, exiting: true } : t))
      );
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 300);
    }, 3000);
  }, []);

  return { toasts, showToast };
}
