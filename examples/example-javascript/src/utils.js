import { getDepthTarget } from './depth.js';
import { formatUser } from './types.js';

export function buildGreeting(name) {
  return `Hello ${formatUser(name)} from ${getDepthTarget()}`;
}
