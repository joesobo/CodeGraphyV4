import type { OwnedGraphActivePerformanceSample, OwnedGraphPerformanceMonitor, OwnedGraphPerformanceSample } from './model';

export function formatOwnedGraphPerformance(sample: OwnedGraphPerformanceSample): string {
  return sample.status === 'idle' ? '— FPS · — ms' : `${Math.round(sample.potentialFps)} FPS · ${sample.frameTimeMs.toFixed(2)} ms`;
}

function setActiveData(output: HTMLOutputElement, sample: OwnedGraphActivePerformanceSample): void {
  output.dataset.frameAverageMs = String(sample.frameTimeMs);
  output.dataset.potentialFps = String(sample.potentialFps);
  output.dataset.sampleCount = String(sample.sampleCount);
}

export function publishOwnedGraphPerformance(sample: OwnedGraphPerformanceSample, output: HTMLOutputElement | null): void {
  if (!output) return;
  output.dataset.performanceStatus = sample.status;
  if (sample.status === 'active') setActiveData(output, sample);
  else {
    delete output.dataset.frameAverageMs; delete output.dataset.potentialFps; delete output.dataset.sampleCount;
  }
  output.textContent = formatOwnedGraphPerformance(sample);
  output.hidden = false;
}

export function resetOwnedGraphPerformance(monitor: OwnedGraphPerformanceMonitor, fpsRef: { current: number | null }, output: HTMLOutputElement | null): void {
  monitor.reset(); fpsRef.current = null; publishOwnedGraphPerformance({ status: 'idle' }, output);
}
