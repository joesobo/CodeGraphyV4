/**
 * Format utilities - imports processing (creates bidirectional edge)
 * Expected: bidirectional edge with processing (format ↔ processing)
 *
 * This circular dependency demonstrates the bidirectionalEdges setting:
 * - 'separate': Shows two distinct arrows (format → processing, processing → format)
 * - 'combined': Shows one thick double-headed arrow (format ↔ processing)
 */
import { truncate } from './processing';

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
