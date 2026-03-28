import { type OrganizeVerdict } from '../types';

export function fileFanOutVerdict(
  fileCount: number,
  warningThreshold: number,
  splitThreshold: number
): OrganizeVerdict {
  if (fileCount >= splitThreshold) {
    return 'SPLIT';
  }

  if (fileCount >= warningThreshold) {
    return 'WARNING';
  }

  return 'STABLE';
}
