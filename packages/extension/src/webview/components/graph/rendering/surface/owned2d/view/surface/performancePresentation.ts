import { useEffect, type MutableRefObject } from 'react';
import type { OwnedGraphPerformanceMonitor } from '../../frame/performance/model';
import { publishOwnedGraphPerformance } from '../../frame/performance/presentation';

export function useOwnedPerformancePresentation(
  show: boolean,
  monitor: MutableRefObject<OwnedGraphPerformanceMonitor>,
  output: MutableRefObject<HTMLOutputElement | null>,
): void {
  useEffect(() => {
    if (show) publishOwnedGraphPerformance(monitor.current.sample(), output.current);
  }, [monitor, output, show]);
}
