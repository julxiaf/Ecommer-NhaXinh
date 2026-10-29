import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class AdminErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[AdminErrorBoundary] Uncaught rendering exception:", error, errorInfo);
  }

  public handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 bg-white rounded-2xl border border-rose-200 shadow-sm max-w-xl mx-auto my-12 text-center space-y-4">
          <div className="w-14 h-14 mx-auto rounded-full bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600">
            <AlertTriangle size={28} />
          </div>

          <div>
            <h3 className="text-base font-bold text-slate-900">
              {this.props.fallbackTitle || "Đã xảy ra lỗi hiển thị giao diện"}
            </h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Thành phần này vừa gặp sự cố trong quá trình hiển thị hoặc render DOM. Hệ thống đã ngăn chặn màn hình trắng.
            </p>
          </div>

          {this.state.error && (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-left text-[11px] font-mono text-rose-700 overflow-x-auto max-h-32">
              {this.state.error.message}
            </div>
          )}

          <div className="pt-2 flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={this.handleReset}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition-all"
            >
              <RefreshCw size={14} /> Thử tải lại thành phần
            </button>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="px-4 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition-all"
            >
              Tải lại toàn trang
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
