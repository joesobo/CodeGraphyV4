/**
 * Format utilities - no imports
 * Expected: no outgoing edges, but incoming from helpers
 */
export function formatDate(date: Date): string {
  return date.toISOString();
}

export function formatCurrency(amount: number): string {
  return `$${amount.toFixed(2)}`;
}
