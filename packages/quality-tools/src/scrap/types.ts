import * as ts from 'typescript';

export type ScrapRemediationMode = 'LOCAL' | 'SPLIT' | 'STABLE';

export type ScrapAiActionability =
  | 'AUTO_REFACTOR'
  | 'AUTO_TABLE_DRIVE'
  | 'LEAVE_ALONE'
  | 'MANUAL_SPLIT'
  | 'REVIEW_FIRST';

export type ScrapRecommendationConfidence = 'HIGH' | 'LOW' | 'MEDIUM';

export type ScrapRecommendationKind =
  | 'EXTRACT_SETUP'
  | 'REVIEW_STRUCTURE'
  | 'STRENGTHEN_ASSERTIONS'
  | 'TABLE_DRIVE';

export interface ScrapValidationIssue {
  line: number;
  message: string;
  kind: 'hook-in-test' | 'nested-test' | 'parse';
}

export interface ScrapRecommendation {
  confidence: ScrapRecommendationConfidence;
  kind: ScrapRecommendationKind;
  message: string;
}

export interface ScrapComparison {
  averageScoreDelta: number;
  coverageMatrixDelta: number;
  extractionPressureDelta: number;
  harmfulDuplicationDelta: number;
  helperHiddenDelta: number;
  maxScoreDelta: number;
  verdict: 'improved' | 'mixed' | 'unchanged' | 'worse';
}

export interface ScrapExampleNode {
  body: ts.FunctionLikeDeclaration;
  blockPath: string[];
  describeDepth: number;
  name: string;
  tableDriven: boolean;
}

export interface ScrapExampleMetric {
  assertionCount: number;
  assertionFeatures?: string[];
  assertionFingerprint?: string;
  blockPath: string[];
  branchCount: number;
  asyncWaitCount?: number;
  concurrencyCount?: number;
  describeDepth: number;
  duplicateSetupGroupSize: number;
  endLine: number;
  exampleFeatures?: string[];
  exampleFingerprint?: string;
  fixtureFeatures?: string[];
  fixtureFingerprint?: string;
  literalShapeFingerprint?: string;
  envMutationCount?: number;
  helperCallCount: number;
  helperHiddenLineCount: number;
  lineCount: number;
  fakeTimerCount?: number;
  moduleMockCount?: number;
  mockCount: number;
  name: string;
  rtlMutationCount?: number;
  rtlQueryCount?: number;
  rtlRenderCount?: number;
  score: number;
  snapshotCount?: number;
  setupDepth?: number;
  setupFeatures?: string[];
  setupFingerprint?: string;
  setupLineCount: number;
  setupSubjectNames?: string[];
  startLine: number;
  subjectNames?: string[];
  tableDriven?: boolean;
  typeOnlyAssertionCount?: number;
  tempResourceCount?: number;
}

export interface ScrapBlockSummary {
  averageScore: number;
  branchingExampleCount: number;
  duplicateSetupExampleCount: number;
  exampleCount: number;
  helperHiddenExampleCount: number;
  hotExampleCount: number;
  lowAssertionExampleCount: number;
  maxScore: number;
  name: string;
  path: string[];
  recommendedExtractionCount?: number;
  remediationMode: ScrapRemediationMode;
  zeroAssertionExampleCount: number;
}

export interface ScrapFileMetric {
  aiActionability?: ScrapAiActionability;
  averageScore: number;
  averageAssertionSimilarity?: number;
  averageExampleSimilarity?: number;
  averageSetupSimilarity?: number;
  averageFixtureSimilarity?: number;
  averageSubjectOverlap?: number;
  assertionShapeDiversity?: number;
  asyncWaitExampleCount?: number;
  branchingExampleCount: number;
  blockSummaries: ScrapBlockSummary[];
  comparison?: ScrapComparison;
  coverageMatrixCandidateCount?: number;
  concurrencyExampleCount?: number;
  distinctSubjectCount?: number;
  duplicateSetupExampleCount: number;
  effectiveDuplicationScore?: number;
  exampleCount: number;
  exampleShapeDiversity?: number;
  extractionPressureScore?: number;
  filePath: string;
  fakeTimerExampleCount?: number;
  moduleMockExampleCount?: number;
  harmfulDuplicationScore?: number;
  fixtureDuplicationScore?: number;
  helperHiddenExampleCount: number;
  literalDuplicationScore?: number;
  envMutationExampleCount?: number;
  lowAssertionExampleCount: number;
  maxScore: number;
  recommendations?: ScrapRecommendation[];
  recommendedExtractionCount?: number;
  remediationMode: ScrapRemediationMode;
  rtlQueryHeavyExampleCount?: number;
  rtlMutationExampleCount?: number;
  rtlRenderExampleCount?: number;
  snapshotExampleCount?: number;
  setupDuplicationScore?: number;
  setupShapeDiversity?: number;
  fixtureShapeDiversity?: number;
  subjectRepetitionScore?: number;
  tableDrivenExampleCount?: number;
  typeOnlyAssertionExampleCount?: number;
  tempResourceExampleCount?: number;
  validationIssues?: ScrapValidationIssue[];
  zeroAssertionExampleCount: number;
  worstExamples: ScrapExampleMetric[];
}
