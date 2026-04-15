import { describe, expect, it } from 'vitest';
import {
  fileIncludeParts,
  sharedDetectorTestIncludes
} from '../../../src/mutation/runner/includeParts';

describe('fileIncludeParts', () => {
  it('derives include parts for nested hyphenated source files', () => {
    expect(fileIncludeParts('sources/type-usage.ts')).toEqual({
      camelName: 'typeUsage',
      directory: 'sources',
      dottedRelativePath: 'sources.type-usage',
      includeBroadFallback: true,
      name: 'type-usage',
      relativeTestDirectory: 'sources/'
    });
  });

  it('disables broad fallback for generic file names', () => {
    expect(fileIncludeParts('extension/graphView/provider/runtime.ts').includeBroadFallback).toBe(false);
  });

  it('normalizes webview component source paths to their test paths', () => {
    expect(fileIncludeParts('webview/components/graph/runtime/use/graph/init.ts')).toEqual({
      camelName: 'init',
      directory: 'webview/graph/runtime/use/graph',
      dottedRelativePath: 'webview.graph.runtime.use.graph.init',
      includeBroadFallback: true,
      name: 'init',
      relativeTestDirectory: 'webview/graph/runtime/use/graph/'
    });
  });
});

describe('sharedDetectorTestIncludes', () => {
  it('returns no detector globs outside source rule directories', () => {
    expect(sharedDetectorTestIncludes('packages/extension/tests', 'extension')).toEqual([]);
  });

  it('returns direct and recursive detector globs for source rule directories', () => {
    expect(sharedDetectorTestIncludes('packages/plugin-csharp/tests', 'sources')).toEqual([
      'packages/plugin-csharp/tests/ruleDetectors.test.ts',
      'packages/plugin-csharp/tests/ruleDetectors.test.tsx',
      'packages/plugin-csharp/tests/*Detectors.test.ts',
      'packages/plugin-csharp/tests/*Detectors.test.tsx'
    ]);
    expect(sharedDetectorTestIncludes('packages/plugin-csharp/tests', 'sources', true)).toEqual([
      'packages/plugin-csharp/tests/**/ruleDetectors.test.ts',
      'packages/plugin-csharp/tests/**/ruleDetectors.test.tsx',
      'packages/plugin-csharp/tests/**/*Detectors.test.ts',
      'packages/plugin-csharp/tests/**/*Detectors.test.tsx'
    ]);
  });
});
