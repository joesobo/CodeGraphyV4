import { getChecklistName } from './checklist';

export function getSummaryTarget(): string {
  return getChecklistName();
}
