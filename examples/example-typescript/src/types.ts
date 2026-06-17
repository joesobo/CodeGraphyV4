export enum UpgradeStage {
  Audit = 'audit',
  Acceptance = 'acceptance',
}

export type ProjectName = string;

export interface UpgradeMetadata {
  owner: ProjectName;
  stage: UpgradeStage;
}

export function formatUser(name: string): string {
  return name.trim();
}
