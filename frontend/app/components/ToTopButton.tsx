"use client";

export default function ToTopButton() {
  return (
    <div
      style={{
        position: "sticky",
        bottom: "32px",
        display: "flex",
        justifyContent: "flex-end",
        paddingRight: "32px",
        marginTop: "-60px",
        pointerEvents: "none",
      }}
    >
      <button
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        aria-label="맨 위로"
        style={{
          pointerEvents: "auto",
          width: "64px",
          height: "64px",
          borderRadius: "50%",
          backgroundColor: "#DCDCDC",
          border: "none",
          cursor: "pointer",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "1px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.10)",
          transition: "opacity 0.15s",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.75")}
        onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#000000"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="18 15 12 9 6 15" />
        </svg>
        <span
          style={{
            fontFamily: "Pretendard, sans-serif",
            fontWeight: 700,
            fontSize: "13px",
            color: "#000000",
            lineHeight: 1,
          }}
        >
          TOP
        </span>
      </button>
    </div>
  );
}