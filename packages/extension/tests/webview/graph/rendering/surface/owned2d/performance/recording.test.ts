import { describe, expect, it } from 'vitest';
import { createOwnedGraphInteractionRecorder } from '../../../../../../../src/webview/components/graph/rendering/surface/owned2d/performance/recording';

describe('owned graph interaction performance recording', () => {
  it('records input and the exact rendered target and neighbor positions', () => {
    const recorder = createOwnedGraphInteractionRecorder();
    recorder.start({ neighborNodeIds: ['leaf'], targetNodeId: 'hub' });

    recorder.recordInput({
      eventTimestampMs: 10,
      nodeId: 'hub',
      phase: 'move',
      targetX: 20,
      targetY: 30,
    });
    recorder.recordFrame({
      alpha: 0.3,
      nodeIds: ['hub', 'leaf', 'other'],
      presentationTimestampMs: 12,
      renderMs: 2,
      renderedX: Float32Array.of(20, 8, 100),
      renderedY: Float32Array.of(30, 9, 100),
      settled: false,
      simulationMs: 1,
      steps: 1,
      vx: Float32Array.of(0, 2, 3),
      vy: Float32Array.of(0, 4, 4),
    });

    expect(recorder.stop()).toEqual({
      frames: [{
        alpha: 0.3,
        kineticEnergy: 45,
        neighbors: [{ id: 'leaf', x: 8, y: 9 }],
        presentationTimestampMs: 12,
        renderMs: 2,
        settled: false,
        simulationMs: 1,
        steps: 1,
        target: { id: 'hub', x: 20, y: 30 },
        totalCpuMs: 3,
      }],
      inputs: [{
        eventTimestampMs: 10,
        nodeId: 'hub',
        phase: 'move',
        sequence: 0,
        targetX: 20,
        targetY: 30,
      }],
      neighborNodeIds: ['leaf'],
      targetNodeId: 'hub',
      truncated: false,
    });
  });

  it('is inert until explicitly armed and returns immutable snapshots', () => {
    const recorder = createOwnedGraphInteractionRecorder();
    recorder.recordInput({
      eventTimestampMs: 1,
      nodeId: 'hub',
      phase: 'down',
      targetX: 0,
      targetY: 0,
    });

    expect(recorder.stop()).toBeNull();
    recorder.start({ neighborNodeIds: [], targetNodeId: 'hub' });
    const first = recorder.stop();
    recorder.start({ neighborNodeIds: [], targetNodeId: 'hub' });
    const second = recorder.stop();

    expect(first).not.toBe(second);
    expect(first?.frames).not.toBe(second?.frames);
    expect(first?.inputs).not.toBe(second?.inputs);
  });

  it('bounds frame and input samples and reports truncation', () => {
    const recorder = createOwnedGraphInteractionRecorder({ capacity: 2 });
    recorder.start({ neighborNodeIds: [], targetNodeId: 'hub' });
    const frame = {
      alpha: 0.3,
      nodeIds: ['hub'],
      renderMs: 1,
      renderedX: Float32Array.of(0),
      renderedY: Float32Array.of(0),
      settled: false,
      simulationMs: 1,
      steps: 1,
      vx: Float32Array.of(0),
      vy: Float32Array.of(0),
    };

    for (let index = 0; index < 3; index += 1) {
      recorder.recordInput({
        eventTimestampMs: index,
        nodeId: 'hub',
        phase: 'move',
        targetX: index,
        targetY: index,
      });
      recorder.recordFrame({ ...frame, presentationTimestampMs: index });
    }

    const result = recorder.stop();
    expect(result?.frames).toHaveLength(2);
    expect(result?.inputs).toHaveLength(2);
    expect(result?.truncated).toBe(true);
  });

  it('ignores input for nodes outside the armed drag target', () => {
    const recorder = createOwnedGraphInteractionRecorder();
    recorder.start({ neighborNodeIds: [], targetNodeId: 'hub' });

    recorder.recordInput({
      eventTimestampMs: 1,
      nodeId: 'other',
      phase: 'move',
      targetX: 1,
      targetY: 2,
    });

    expect(recorder.stop()?.inputs).toEqual([]);
  });
});
