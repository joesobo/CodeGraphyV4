import { BaseRunner } from './baseRunner';
import type { RunnableThing } from './runnableThing';

export class AppRunner extends BaseRunner implements RunnableThing {
  run(): string {
    return this.start();
  }
}
