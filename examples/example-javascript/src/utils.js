import { getDepthTarget } from './depth.js';
import { normalizeUserName } from './user.js';

export function buildGreeting(name) {
  return `Hello ${normalizeUserName(name)} from ${getDepthTarget()}`;
}
