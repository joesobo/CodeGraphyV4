import { formatUser } from '../../shared/src/types';
import { buildGreeting } from './utils';

const currentUser = formatUser('CodeGraphy');

console.log(buildGreeting(currentUser));
