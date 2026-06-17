import { BaseRunner } from './baseRunner';
import type { RunnableThing } from './runnableThing';

export class UpgradeRunner extends BaseRunner implements RunnableThing {
  run(projectName: string): string {
    return this.markStarted(projectName);
  }
}
