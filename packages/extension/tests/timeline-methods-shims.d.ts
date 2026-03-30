declare module '../../timeline/provider/indexing' {
  export function indexGraphViewProviderRepository(...args: unknown[]): Promise<void>;
  export function jumpGraphViewProviderToCommit(...args: unknown[]): Promise<void>;
  export function sendGraphViewProviderCachedTimeline(...args: unknown[]): void;
}

declare module '../../timeline/playback' {
  export function invalidateGraphViewTimelineCache(...args: unknown[]): Promise<unknown>;
  export function sendGraphViewPlaybackSpeed(...args: unknown[]): void;
}

declare module '../../timeline/open' {
  export function openGraphViewNodeInEditor(...args: unknown[]): Promise<void>;
  export function previewGraphViewFileAtCommit(...args: unknown[]): Promise<void>;
}
