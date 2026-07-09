import {
  perfMetricNameSchema as corePerfMetricNameSchema,
  perfMetricUnitSchema as corePerfMetricUnitSchema,
} from '@codegraphy-dev/core';
import { describe, expect, it } from 'vitest';

import {
  perfMetricNameSchema,
  perfMetricUnitSchema,
} from '../../../src/shared/perf/metrics';

describe('shared/perf/metrics', () => {
  it('keeps metric names aligned with Core performance diagnostics', () => {
    expect(perfMetricNameSchema.options).toEqual(corePerfMetricNameSchema.options);
  });

  it('keeps metric units aligned with Core performance diagnostics', () => {
    expect(perfMetricUnitSchema.options).toEqual(corePerfMetricUnitSchema.options);
  });
});
