import { normalizeUserName } from './user.js';
import { buildGreeting } from './utils.js';

export const currentUser = normalizeUserName('CodeGraphy');

console.log(buildGreeting(currentUser));
