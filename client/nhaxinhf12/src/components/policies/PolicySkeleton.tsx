export default function PolicySkeleton() {
  return (
    <div className="policy-layout" style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: 32, alignItems: "start" }}>
      {/* Sidebar Skeleton */}
      <aside
        style={{
          background: "#fff",
          border: "1px solid #e8e4df",
          borderRadius: 12,
          padding: 20,
        }}
      >
        <div
          className="policy-skeleton-shimmer"
          style={{ height: 20, width: "65%", borderRadius: 4, marginBottom: 20, background: "#f0ece7" }}
        />
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="policy-skeleton-shimmer"
              style={{
                height: 44,
                width: "100%",
                borderRadius: 8,
                background: "#f5f2ee",
              }}
            />
          ))}
        </div>
      </aside>

      {/* Article Content Skeleton */}
      <article
        style={{
          background: "#fff",
          border: "1px solid #e8e4df",
          borderRadius: 12,
          padding: "40px 48px",
          minHeight: 500,
        }}
      >
        <div
          className="policy-skeleton-shimmer"
          style={{ height: 14, width: 180, borderRadius: 4, marginBottom: 16, background: "#f0ece7" }}
        />
        <div
          className="policy-skeleton-shimmer"
          style={{ height: 36, width: "75%", borderRadius: 6, marginBottom: 24, background: "#f0ece7" }}
        />
        <div
          className="policy-skeleton-shimmer"
          style={{ height: 18, width: "95%", borderRadius: 4, marginBottom: 10, background: "#f5f2ee" }}
        />
        <div
          className="policy-skeleton-shimmer"
          style={{ height: 18, width: "90%", borderRadius: 4, marginBottom: 32, background: "#f5f2ee" }}
        />

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div
            className="policy-skeleton-shimmer"
            style={{ height: 24, width: "40%", borderRadius: 4, marginTop: 16, background: "#f0ece7" }}
          />
          <div
            className="policy-skeleton-shimmer"
            style={{ height: 16, width: "100%", borderRadius: 4, background: "#f5f2ee" }}
          />
          <div
            className="policy-skeleton-shimmer"
            style={{ height: 16, width: "96%", borderRadius: 4, background: "#f5f2ee" }}
          />
          <div
            className="policy-skeleton-shimmer"
            style={{ height: 16, width: "92%", borderRadius: 4, background: "#f5f2ee" }}
          />
        </div>
      </article>
    </div>
  );
}
