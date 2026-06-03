import type { ElectronApplication, Frame, Page } from '@playwright/test';

export interface VSCodeFixture {
  app: ElectronApplication;
  page: Page;
  tempRoot: string;
}

export interface Point {
  x: number;
  y: number;
}

export interface NodeProbe {
  path: string;
  center: Point;
  radius: number;
}

export interface AcceptanceRuntimeStep {
  keyword: string;
  text: string;
  sourcePath: string;
  line: number;
}

export interface GraphAcceptanceContext {
  cleanup: () => Promise<void>;
  exampleName?: string;
  workspaceTempRoot?: string;
  workspacePath?: string;
  vscode?: VSCodeFixture;
  graphFrame?: Frame;
  beforeIndexNodeCount?: number;
  beforeIndexStageImage?: Buffer;
  nodeProbes: Map<string, NodeProbe>;
  beforeDragCenter?: Point;
  afterDragCenter?: Point;
  dropCenter?: Point;
  beforeZoomNodeSize?: number;
}

export type AcceptanceStepImplementation = (
  context: GraphAcceptanceContext,
  step: AcceptanceRuntimeStep
) => Promise<void>;
