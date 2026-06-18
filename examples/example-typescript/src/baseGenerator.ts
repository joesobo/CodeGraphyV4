export class BaseGenerator {
  protected markGenerated(mood: string): string {
    return `Generated ${mood}`;
  }
}
