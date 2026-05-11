import { getDepthTarget } from './depth';
import { formatUser } from './types';

export function buildGreeting(name: string): string {
  return `Hello ${formatUser(name)} from ${getDepthTarget()}`;
}
