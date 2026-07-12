// Shared recharts theme so every chart (analytics + dashboard) reads as one system.
export const AXIS = "var(--muted-foreground)";
export const GRID = "var(--border)";

export const CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

export const TOOLTIP_STYLE = {
  background: "var(--popover)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  fontSize: 12,
} as const;

// Status → its semantic color token (matches STATUS_DOT/STATUS_BADGE in lib/labels).
export const STATUS_CHART_COLOR: Record<string, string> = {
  OPEN: "var(--status-open)",
  IN_PROGRESS: "var(--status-in-progress)",
  REVIEW: "var(--status-review)",
  BLOCKED: "var(--status-blocked)",
  DONE: "var(--status-done)",
  CANCELLED: "var(--status-cancelled)",
};
