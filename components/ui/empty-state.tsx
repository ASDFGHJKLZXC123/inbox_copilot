"use client";

export interface EmptyStateAction {
  label: string;
  onClick: () => void;
}

export interface EmptyStateProps {
  icon: string;
  title: string;
  description: string;
  action?: EmptyStateAction;
}

/**
 * A centered empty-state illustration with an icon, title, description,
 * and an optional call-to-action button.
 *
 * Uses only inline styles — no external CSS framework dependency.
 */
export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        padding: "40px 24px",
        gap: "12px",
        minHeight: "180px",
      }}
      role="status"
      aria-label={title}
    >
      {/* Icon */}
      <span
        style={{
          fontSize: "2.8rem",
          lineHeight: 1,
          display: "block",
          marginBottom: "4px",
          opacity: 0.72,
          userSelect: "none",
        }}
        aria-hidden="true"
      >
        {icon}
      </span>

      {/* Title */}
      <p
        style={{
          margin: 0,
          fontSize: "1.05rem",
          fontWeight: 700,
          color: "#1f1a17",
          lineHeight: 1.3,
        }}
      >
        {title}
      </p>

      {/* Description */}
      <p
        style={{
          margin: 0,
          fontSize: "0.88rem",
          color: "#6d625a",
          maxWidth: "280px",
          lineHeight: 1.55,
        }}
      >
        {description}
      </p>

      {/* Optional action */}
      {action ? (
        <button
          type="button"
          onClick={action.onClick}
          style={{
            marginTop: "8px",
            padding: "10px 20px",
            borderRadius: "14px",
            border: "1px solid rgba(77, 54, 34, 0.18)",
            background: "#a1431f",
            color: "#fff",
            fontSize: "0.9rem",
            fontFamily: "inherit",
            cursor: "pointer",
            fontWeight: 600,
            letterSpacing: "0.02em",
          }}
        >
          {action.label}
        </button>
      ) : null}
    </div>
  );
}
