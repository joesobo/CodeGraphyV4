/**
 * Format utilities - imports helpers (creates bidirectional edge)
 * Expected: bidirectional edge with helpers (format ↔ helpers)
 *
 * This circular dependency demonstrates the bidirectionalEdges setting:
 * - 'separate': Shows two distinct arrows (format → helpers, helpers → format)
 * - 'combined': Shows one thick double-headed arrow (format ↔ helpers)
 */
import { truncate } from './helpers';

export function formatDate(date: Date): string {
  return date.toISOString();
}

export function formatCurrency(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

/** Formats a label, truncating if too long */
export function formatLabel(label: string): string {
  return truncate(label, 20);
}
