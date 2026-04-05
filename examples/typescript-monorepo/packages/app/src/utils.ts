import { getDepthTarget } from '../../feature-depth/src/deep';
import { formatUser } from '../../shared/src/types';

export function buildGreeting(name: string): string {
  return `Hello ${formatUser(name)} from ${getDepthTarget()}`;
}
