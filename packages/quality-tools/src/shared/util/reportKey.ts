function trimEdgeDashes(value: string): string {
  return value.replace(/^-+/, '').replace(/-+$/, '');
}

function reportKeySegments(value: string): string[] {
  return value
    .toLowerCase()
    .split(/[^a-z0-9.-]+/)
    .map(trimEdgeDashes)
    .filter((segment) => segment !== '');
}

export function sanitizeReportKey(value: string): string {
  return reportKeySegments(value).join('-');
}
