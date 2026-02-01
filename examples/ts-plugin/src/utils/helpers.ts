/**
 * Helper utilities - imports format
 * Expected: edge to format
 */
import { formatDate } from './format';

export function processData(data: unknown) {
  return {
    timestamp: formatDate(new Date()),
    data,
  };
}
