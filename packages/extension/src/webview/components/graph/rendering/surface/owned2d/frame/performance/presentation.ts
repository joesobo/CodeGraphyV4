import type { OwnedGraphActivePerformanceSample, OwnedGraphPerformanceMonitor, OwnedGraphPerformanceSample } from './model';

export function formatOwnedGraphPerformance(sample: OwnedGraphPerformanceSample): string {
  return sample.status === 'idle' ? '— FPS · — ms' : `${Math.round(sample.renderedFps)} FPS · ${sample.frameTimeMs.toFixed(2)} ms`;
}

function setActiveData(output: HTMLOutputElement, sample: OwnedGraphActivePerformanceSample): void {
  output.dataset.frameAverageMs = String(sample.frameTimeMs);
  output.dataset.renderedFps = String(sample.renderedFps);
  output.dataset.sampleCount = String(sample.sampleCount);
}

function clearActiveData(output: HTMLOutputElement): void {
  delete output.dataset.frameAverageMs;
  delete output.dataset.renderedFps;
  delete output.dataset.sampleCount;
}

export function publishOwnedGraphPerformance(sample: OwnedGraphPerformanceSample, output: HTMLOutputElement | null): void {
  if (!output) return;
  output.dataset.performanceStatus = sample.status;
  if (sample.status === 'active') setActiveData(output, sample);
  else clearActiveData(output);
  output.textContent = formatOwnedGraphPerformance(sample);
  output.hidden = false;
}

function publishSettledPerformanceSample(
  sample: OwnedGraphPerformanceSample | undefined,
  fpsRef: { current: number | null },
  output: HTMLOutputElement | null,
): void {
  if (!sample) return;
  fpsRef.current = sample.status === 'active' ? sample.renderedFps : null;
  publishOwnedGraphPerformance(sample, output);
}

export function completeOwnedGraphPerformanceFrame(
  monitor: OwnedGraphPerformanceMonitor,
  submissionId: number,
  fpsRef: { current: number | null },
  output: HTMLOutputElement | null,
): void {
  publishSettledPerformanceSample(monitor.completeFrame(submissionId), fpsRef, output);
}

export function discardOwnedGraphPerformanceFrame(
  monitor: OwnedGraphPerformanceMonitor,
  submissionId: number,
  fpsRef: { current: number | null },
  output: HTMLOutputElement | null,
): void {
  publishSettledPerformanceSample(monitor.discardFrame(submissionId), fpsRef, output);
}

export function resetOwnedGraphPerformance(monitor: OwnedGraphPerformanceMonitor, fpsRef: { current: number | null }, output: HTMLOutputElement | null): void {
  monitor.reset();
  fpsRef.current = null;
  publishOwnedGraphPerformance({ status: 'idle' }, output);
}
