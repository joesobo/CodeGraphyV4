/**
 * Processing utilities - imports format
 * Expected: bidirectional edge with format (processing ↔ format)
 */
import { formatDate } from './format';

export function processData(data: unknown) {
  return {
    timestamp: formatDate(new Date()),
    data,
  };
}

/** Used by format.ts to demonstrate bidirectional edges */
export function truncate(str: string, maxLength: number): string {
  return str.length > maxLength ? str.slice(0, maxLength) + '...' : str;
}
