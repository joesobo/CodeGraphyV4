import type { User } from './types';
import { padLabel } from './deep';

export function formatUser(user: User): string {
  return `${padLabel(user.name)} (${user.id})`;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
