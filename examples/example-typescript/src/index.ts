import { formatUser } from './types';
import type { UserName } from './types';
import { buildGreeting } from './utils';

export const currentUser: UserName = formatUser('CodeGraphy');

console.log(buildGreeting(currentUser));
