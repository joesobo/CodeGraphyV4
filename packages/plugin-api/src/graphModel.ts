import type { CodeGraphyAccessKey } from './access';
import type { GraphMetadata, IGraphData } from './graph';

export type GraphModelAccessRequirement =
  CodeGraphyAccessKey
  | readonly CodeGraphyAccessKey[];

export interface IGraphModelContributionBase {
  id: string;
  label: string;
  requiresAccess?: GraphModelAccessRequirement;
  metadata?: GraphMetadata;
}

export interface IGraphModelContributionContext {
  graphData: IGraphData;
  workspaceRoot?: string;
}

export interface IGraphModelContribution extends IGraphModelContributionBase {
  build(context: IGraphModelContributionContext): IGraphData;
}

export interface IGraphModelContributions {
  contributions?: readonly IGraphModelContribution[];
}
