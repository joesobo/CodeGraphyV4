/**
 * @fileoverview Formatting utilities for file metadata display.
 * @module webview/components/tooltipFormatters
 */

/**
 * Formats a byte count into a human-readable file size string.
 *
 * @param bytes - Size in bytes
 * @returns Formatted string like "1.2 KB" or "3.4 MB"
 */
export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Formats a Unix timestamp (ms) as a relative time string.
 *
 * @param timestamp - Milliseconds since epoch
 * @returns Relative time string like "5m ago", "2h ago", or a locale date
 */
export function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;

  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;

  return new Date(timestamp).toLocaleDateString();
}
