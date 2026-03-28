import * as ts from 'typescript';
import { collectCallCount, isTypeOnlyAssertionCall } from '../example/calls/extract';
import {
  isAsyncWaitCall,
  isConcurrencyCall
} from '../vitest/asyncMatchers';
import {
  isEnvironmentMutationCall,
  isFakeTimerMutationCall,
  isModuleMockLifecycleCall,
  isSnapshotCall
} from '../vitest/mutationMatchers';

export interface VitestSignalMetric {
  asyncWaitCount: number;
  concurrencyCount: number;
  envMutationCount: number;
  fakeTimerCount: number;
  moduleMockCount: number;
  snapshotCount: number;
  typeOnlyAssertionCount: number;
}

function countConcurrentAncestors(node: ts.Node): number {
  let count = 0;
  let parent = node.parent;

  while (parent) {
    if (ts.isCallExpression(parent) && isConcurrencyCall(parent)) {
      count += 1;
    }

    parent = parent.parent;
  }

  return count;
}

export function analyzeVitestSignals(node: ts.Node): VitestSignalMetric {
  return {
    asyncWaitCount: collectCallCount(node, isAsyncWaitCall),
    concurrencyCount: collectCallCount(node, isConcurrencyCall) + countConcurrentAncestors(node),
    envMutationCount: collectCallCount(node, isEnvironmentMutationCall),
    fakeTimerCount: collectCallCount(node, isFakeTimerMutationCall),
    moduleMockCount: collectCallCount(node, isModuleMockLifecycleCall),
    snapshotCount: collectCallCount(node, isSnapshotCall),
    typeOnlyAssertionCount: collectCallCount(node, isTypeOnlyAssertionCall)
  };
}
