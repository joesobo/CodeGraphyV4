import { describe, expect, it } from 'vitest';
import { callInfo, terminalCallName } from '../../src/scrap/callNames';
import {
  isEnvironmentMutationCall,
  isFakeTimerMutationCall,
  isModuleMockLifecycleCall,
  isSnapshotCall
} from '../../src/scrap/vitestSignalMatchers';
import { selectVitestCall } from './vitestCallTestSupport';

describe('vitestMutationMatchers', () => {
  it('detects snapshot assertions and rejects unrelated matcher calls', () => {
    expect(isSnapshotCall(selectVitestCall(
      `expect(value).toMatchSnapshot();`,
      (value) => terminalCallName(value.expression) === 'toMatchSnapshot'
    ))).toBe(true);
    expect(isSnapshotCall(selectVitestCall(
      `(resolveMatcher())();`,
      () => true
    ))).toBe(false);
  });

  it('detects fake timer and env mutation calls only on vi', () => {
    expect(isFakeTimerMutationCall(selectVitestCall(
      `vi.useFakeTimers();`,
      (value) => callInfo(value.expression).baseName === 'vi'
    ))).toBe(true);
    expect(isFakeTimerMutationCall(selectVitestCall(
      `clock.useFakeTimers();`,
      () => true
    ))).toBe(false);
    expect(isEnvironmentMutationCall(selectVitestCall(
      `vi.stubEnv('A', 'B');`,
      (value) => callInfo(value.expression).baseName === 'vi'
    ))).toBe(true);
    expect(isEnvironmentMutationCall(selectVitestCall(
      `helpers.stubEnv('A', 'B');`,
      () => true
    ))).toBe(false);
  });

  it('detects module mock lifecycle calls but not plain module mocks', () => {
    expect(isModuleMockLifecycleCall(selectVitestCall(
      `vi.doMock('./thing');`,
      (value) => callInfo(value.expression).baseName === 'vi'
    ))).toBe(true);
    expect(isModuleMockLifecycleCall(selectVitestCall(
      `vi.unmock('./thing');`,
      (value) => terminalCallName(value.expression) === 'unmock'
    ))).toBe(true);
    expect(isModuleMockLifecycleCall(selectVitestCall(
      `vi.hoisted(() => ({}));`,
      (value) => terminalCallName(value.expression) === 'hoisted'
    ))).toBe(true);
    expect(isModuleMockLifecycleCall(selectVitestCall(
      `vi.mock('./thing');`,
      () => true
    ))).toBe(false);
    expect(isModuleMockLifecycleCall(selectVitestCall(
      `mocker.doMock('./thing');`,
      () => true
    ))).toBe(false);
  });
});
