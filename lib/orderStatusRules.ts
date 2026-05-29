/**
 * Frontend mirror of backend utils/orderStatusRules.js
 * Enforces forward-only lifecycle, mandatory field rules,
 * and provides helpers for labels/badge styling.
 */

export const ORDER_STATUSES = {
  CONFIRMED: "CONFIRMED",
  PROCESSING: "PROCESSING",
  SHIPPED: "SHIPPED",
  DELIVERED: "DELIVERED",
  CANCELLED: "CANCELLED",
  REFUND: "REFUND",
  PARTIAL_REFUND: "PARTIAL_REFUND",
} as const;

export type OrderStatus = (typeof ORDER_STATUSES)[keyof typeof ORDER_STATUSES];

export const TERMINAL_STATUSES: OrderStatus[] = [
  ORDER_STATUSES.CANCELLED,
  ORDER_STATUSES.REFUND,
  ORDER_STATUSES.PARTIAL_REFUND,
];

/** Valid forward-only transitions map */
const TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  CONFIRMED: ["PROCESSING", "CANCELLED"],
  PROCESSING: ["SHIPPED", "CANCELLED"],
  SHIPPED: ["DELIVERED", "CANCELLED"],
  DELIVERED: ["REFUND", "PARTIAL_REFUND"],
  CANCELLED: [],
  REFUND: [],
  PARTIAL_REFUND: [],
};

/**
 * Returns the list of allowed next statuses for a given current status
 * (for SELLER and ADMIN roles only — customers use separate APIs).
 */
export function getAllowedTransitions(currentStatus: string | null | undefined): OrderStatus[] {
  if (!currentStatus) return [];
  const normalized = currentStatus.toUpperCase() as OrderStatus;
  if (TERMINAL_STATUSES.includes(normalized)) return [];
  return TRANSITIONS[normalized] ?? [];
}

/**
 * Returns true if the status is terminal (no further changes allowed).
 */
export function isTerminalStatus(status: string | null | undefined): boolean {
  if (!status) return false;
  return TERMINAL_STATUSES.includes(status.toUpperCase() as OrderStatus);
}

/**
 * Returns the fields required by the backend for a given target status.
 */
export function getRequiredFields(targetStatus: string): string[] {
  const normalized = targetStatus.toUpperCase();
  if (normalized === "SHIPPED") return ["trackingNumber", "estimatedDelivery"];
  if (["CANCELLED", "REFUND", "PARTIAL_REFUND"].includes(normalized)) return ["reason"];
  return [];
}

/** Validate a status update payload before calling the API. */
export function validateStatusUpdate(
  targetStatus: string,
  payload: Record<string, string>
): { valid: boolean; errors: string[] } {
  const required = getRequiredFields(targetStatus);
  const errors: string[] = [];

  required.forEach((field) => {
    if (!payload[field] || payload[field].trim() === "") {
      const label = field === "trackingNumber"
        ? "Tracking number"
        : field === "estimatedDelivery"
        ? "Estimated delivery date"
        : "Reason";
      errors.push(`${label} is required when transitioning to ${getStatusLabel(targetStatus)}.`);
    }
  });

  if (
    targetStatus.toUpperCase() === "SHIPPED" &&
    payload.estimatedDelivery &&
    isNaN(new Date(payload.estimatedDelivery).getTime())
  ) {
    errors.push("Estimated delivery date must be a valid date.");
  }

  return errors.length === 0 ? { valid: true, errors: [] } : { valid: false, errors };
}

/** Human-readable label for a status value. */
export function getStatusLabel(status: string | null | undefined): string {
  const labels: Record<string, string> = {
    PENDING: "Pending",
    CONFIRMED: "Confirmed",
    PROCESSING: "Processing",
    SHIPPED: "Shipped",
    DELIVERED: "Delivered",
    CANCELLED: "Cancelled",
    RETURNED: "Returned",
    REFUNDED: "Refunded",
    REFUND: "Refund",
    PARTIAL_REFUND: "Partial Refund",
  };
  return labels[status?.toUpperCase() ?? ""] ?? (status || "Unknown");
}

/**
 * Returns Tailwind CSS classes for a status badge.
 * Used with shadcn Badge or plain spans.
 */
export function getStatusBadgeVariant(
  status: string | null | undefined
): "default" | "secondary" | "destructive" | "outline" {
  const s = status?.toUpperCase();
  if (s === "DELIVERED") return "default";
  if (s === "CANCELLED" || s === "REFUND" || s === "PARTIAL_REFUND") return "destructive";
  return "secondary";
}

/** Returns a list of all non-terminal statuses for filter dropdowns. */
export function getActiveStatuses(): OrderStatus[] {
  return ["CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED"];
}

/** Returns all statuses for filter dropdowns. */
export function getAllStatuses(): OrderStatus[] {
  return Object.values(ORDER_STATUSES);
}
