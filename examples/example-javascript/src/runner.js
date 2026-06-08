import { BaseRunner } from './baseRunner.js';
import { RunnableThing } from './runnableThing.js';

/**
 * @implements {RunnableThing}
 */
export class AppRunner extends BaseRunner {
  run() {
    return this.start();
  }
}
