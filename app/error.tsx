"use client";

export default function Error({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "100vh",
        gap: "1rem"
      }}
    >
      <h2>Something went wrong</h2>
      <p style={{ color: "#666", maxWidth: "480px", textAlign: "center" }}>
        {error.message || "An unexpected error occurred."}
      </p>
      {error.digest && (
        <p style={{ fontSize: "0.75rem", color: "#999" }}>Error ID: {error.digest}</p>
      )}
      <button
        onClick={reset}
        style={{
          padding: "0.5rem 1.25rem",
          cursor: "pointer",
          borderRadius: "4px",
          border: "1px solid #ccc",
          background: "#fff",
          fontSize: "0.875rem"
        }}
      >
        Try again
      </button>
    </div>
  );
}
