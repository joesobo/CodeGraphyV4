export class BaseRunner {
  protected markStarted(projectName: string): string {
    return `Started ${projectName}`;
  }
}
