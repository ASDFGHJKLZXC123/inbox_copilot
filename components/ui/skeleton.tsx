"use client";

export interface SkeletonProps {
  width?: string;
  height?: string;
  borderRadius?: string;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * A pulsing gray rectangle used as a loading placeholder.
 * The keyframe animation is injected once via a <style> tag rendered inside
 * the component. React deduplicates identical <style> tags when server-rendering
 * and the browser ignores duplicates in the head, so multiple Skeleton instances
 * on the same page are safe.
 */
export function Skeleton({
  width = "100%",
  height = "16px",
  borderRadius = "6px",
  className,
  style,
}: SkeletonProps) {
  return (
    <>
      <style>{`
        @keyframes skeleton-pulse {
          0%   { opacity: 1; }
          50%  { opacity: 0.45; }
          100% { opacity: 1; }
        }
        .skeleton-pulse {
          animation: skeleton-pulse 1.6s ease-in-out infinite;
          background: rgba(161, 67, 31, 0.1);
          display: block;
          flex-shrink: 0;
        }
      `}</style>
      <span
        className={`skeleton-pulse${className ? ` ${className}` : ""}`}
        aria-hidden="true"
        style={{
          width,
          height,
          borderRadius,
          ...style,
        }}
      />
    </>
  );
}

/** A preset row that matches the visual height of a thread-list item. */
export function ThreadRowSkeleton() {
  return (
    <div
      style={{
        padding: "14px",
        borderRadius: "16px",
        border: "1px solid rgba(77, 54, 34, 0.14)",
        background: "rgba(255, 255, 255, 0.56)",
        display: "grid",
        gap: "8px",
      }}
      aria-hidden="true"
    >
      <Skeleton height="14px" width="70%" />
      <Skeleton height="12px" width="45%" />
    </div>
  );
}

/** A preset block that mimics a summary bullet list. */
export function SummarySkeletonBlock() {
  return (
    <div
      className="stack"
      aria-busy="true"
      aria-label="Loading summary"
      style={{ display: "grid", gap: "10px" }}
    >
      <Skeleton height="18px" width="60%" />
      <Skeleton height="14px" />
      <Skeleton height="14px" width="85%" />
      <Skeleton height="14px" width="65%" />
    </div>
  );
}

/** A preset block that mimics a draft textarea. */
export function DraftSkeletonBlock() {
  return (
    <div
      className="stack"
      aria-busy="true"
      aria-label="Loading draft"
      style={{ display: "grid", gap: "10px" }}
    >
      <Skeleton height="14px" />
      <Skeleton height="14px" width="90%" />
      <Skeleton height="14px" width="75%" />
      <Skeleton height="14px" width="55%" />
      <Skeleton height="14px" width="80%" />
      <Skeleton height="14px" width="40%" />
    </div>
  );
}
