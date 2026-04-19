import { formatUser } from '../../shared/src/types';
import type { UserName } from '../../shared/src/types';
import { buildGreeting } from './utils';

const currentUser: UserName = formatUser('CodeGraphy');

console.log(buildGreeting(currentUser));
