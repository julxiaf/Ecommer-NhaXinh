type Listener = () => void;

class ApiProgressTracker {
  private activeCount = 0;
  private isSlow = false;
  private isVerySlow = false;
  private slowTimeout: ReturnType<typeof setTimeout> | null = null;
  private verySlowTimeout: ReturnType<typeof setTimeout> | null = null;
  private listeners = new Set<Listener>();
  private initialized = false;

  subscribe(listener: Listener) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    this.listeners.forEach((fn) => {
      try {
        fn();
      } catch (err) {
        console.error("[ApiProgressTracker] Error in listener:", err);
      }
    });
  }

  getState() {
    return {
      activeCount: this.activeCount,
      isLoading: this.activeCount > 0,
      isSlow: this.isSlow,
      isVerySlow: this.isVerySlow,
    };
  }

  startRequest() {
    this.activeCount++;
    if (this.activeCount === 1) {
      this.isSlow = false;
      this.isVerySlow = false;
      if (this.slowTimeout) clearTimeout(this.slowTimeout);
      if (this.verySlowTimeout) clearTimeout(this.verySlowTimeout);

      // Nếu request chạy quá 2.5 giây mà chưa xong -> kích hoạt trạng thái chậm (Slow)
      this.slowTimeout = setTimeout(() => {
        if (this.activeCount > 0) {
          this.isSlow = true;
          this.notify();
        }
      }, 2500);

      // Nếu request chạy quá 8 giây -> kích hoạt trạng thái rất chậm (Very Slow)
      this.verySlowTimeout = setTimeout(() => {
        if (this.activeCount > 0) {
          this.isVerySlow = true;
          this.notify();
        }
      }, 8000);
    }
    this.notify();
  }

  endRequest() {
    this.activeCount = Math.max(0, this.activeCount - 1);
    if (this.activeCount === 0) {
      if (this.slowTimeout) clearTimeout(this.slowTimeout);
      if (this.verySlowTimeout) clearTimeout(this.verySlowTimeout);
      this.isSlow = false;
      this.isVerySlow = false;
    }
    this.notify();
  }

  initGlobalFetchTracker() {
    if (this.initialized || typeof window === "undefined" || !window.fetch) return;
    this.initialized = true;

    const originalFetch = window.fetch.bind(window);
    window.fetch = async (...args) => {
      const url =
        typeof args[0] === "string"
          ? args[0]
          : args[0] instanceof Request
          ? args[0].url
          : "";
      const isApiRequest = url.includes("/api/") || url.startsWith("/api");

      if (isApiRequest) {
        this.startRequest();
      }

      try {
        return await originalFetch(...args);
      } finally {
        if (isApiRequest) {
          this.endRequest();
        }
      }
    };
  }
}

export const apiTracker = new ApiProgressTracker();

