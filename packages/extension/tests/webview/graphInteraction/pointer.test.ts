import { describe, expect, it } from 'vitest';
import {
  shouldMarkRightMouseDrag,
  shouldUseRightClickFallback,
} from '../../../src/webview/components/graphInteraction/pointer';

describe('graphInteraction pointer', () => {
  it('keeps right-click drag inactive while movement stays within the threshold', () => {
    expect(
      shouldMarkRightMouseDrag({ startX: 10, startY: 20, nextX: 12, nextY: 22, thresholdPx: 6 }),
    ).toBe(false);
  });

  it('marks right-click drag as moved once the threshold is exceeded', () => {
    expect(
      shouldMarkRightMouseDrag({ startX: 10, startY: 20, nextX: 20, nextY: 30, thresholdPx: 6 }),
    ).toBe(true);
  });

  it('marks right-click drag as moved when horizontal movement alone exceeds the threshold', () => {
    expect(
      shouldMarkRightMouseDrag({ startX: 10, startY: 20, nextX: 17, nextY: 20, thresholdPx: 6 }),
    ).toBe(true);
  });

  it('marks right-click drag as moved when vertical movement alone exceeds the threshold', () => {
    expect(
      shouldMarkRightMouseDrag({ startX: 10, startY: 20, nextX: 10, nextY: 27, thresholdPx: 6 }),
    ).toBe(true);
  });

  it('keeps right-click drag inactive when movement lands exactly on the threshold radius', () => {
    expect(
      shouldMarkRightMouseDrag({ startX: 10, startY: 20, nextX: 16, nextY: 20, thresholdPx: 6 }),
    ).toBe(false);
  });

  it('suppresses the right-click fallback when the graph callback ran recently', () => {
    expect(
      shouldUseRightClickFallback({
        now: 1000,
        lastGraphContextEvent: 990,
        lastContainerContextMenuEvent: 0,
        fallbackDelayMs: 40,
      }),
    ).toBe(false);
  });

  it('suppresses the right-click fallback when the graph callback is inside the recent window', () => {
    expect(
      shouldUseRightClickFallback({
        now: 1000,
        lastGraphContextEvent: 900,
        lastContainerContextMenuEvent: 0,
        fallbackDelayMs: 40,
      }),
    ).toBe(false);
  });

  it('suppresses the right-click fallback when the graph callback lands on the recent-window boundary', () => {
    expect(
      shouldUseRightClickFallback({
        now: 1000,
        lastGraphContextEvent: 880,
        lastContainerContextMenuEvent: 0,
        fallbackDelayMs: 40,
      }),
    ).toBe(false);
  });

  it('suppresses the right-click fallback when the container context menu ran recently', () => {
    expect(
      shouldUseRightClickFallback({
        now: 1000,
        lastGraphContextEvent: 0,
        lastContainerContextMenuEvent: 990,
        fallbackDelayMs: 40,
      }),
    ).toBe(false);
  });

  it('suppresses the right-click fallback when the container context menu is inside the recent window', () => {
    expect(
      shouldUseRightClickFallback({
        now: 1000,
        lastGraphContextEvent: 0,
        lastContainerContextMenuEvent: 900,
        fallbackDelayMs: 40,
      }),
    ).toBe(false);
  });

  it('suppresses the right-click fallback when the container context menu lands on the recent-window boundary', () => {
    expect(
      shouldUseRightClickFallback({
        now: 1000,
        lastGraphContextEvent: 0,
        lastContainerContextMenuEvent: 880,
        fallbackDelayMs: 40,
      }),
    ).toBe(false);
  });

  it('allows the right-click fallback when both context signals are stale', () => {
    expect(
      shouldUseRightClickFallback({
        now: 1000,
        lastGraphContextEvent: 500,
        lastContainerContextMenuEvent: 600,
        fallbackDelayMs: 40,
      }),
    ).toBe(true);
  });
});
