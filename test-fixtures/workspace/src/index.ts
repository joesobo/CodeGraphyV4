import type { Config } from './types';
import { formatUser, clamp } from './utils';

const config: Config = {
  maxItems: 100,
  debug: false,
};

const user = { id: '1', name: 'Alice' };
console.log(formatUser(user));
console.log(clamp(config.maxItems, 0, 200));
