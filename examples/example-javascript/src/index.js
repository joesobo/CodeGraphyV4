import { formatUser } from './types.js';
import { buildGreeting } from './utils.js';

export const currentUser = formatUser('CodeGraphy');

console.log(buildGreeting(currentUser));
