import {
  WorkspacePipelineCachedGraphFacade,
  type WorkspacePipelineCachedGraphLoadOptions,
} from './cachedGraph';

export type { WorkspacePipelineCachedGraphLoadOptions };

export abstract class WorkspacePipelineDiscoveryFacade extends WorkspacePipelineCachedGraphFacade {
  abstract clearCache(): void;
}
