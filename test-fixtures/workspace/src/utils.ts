import type { User } from './types';

export function formatUser(user: User): string {
  return `${user.name} (${user.id})`;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
