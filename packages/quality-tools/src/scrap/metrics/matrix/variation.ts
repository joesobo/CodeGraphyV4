import { type ScrapExampleMetric } from '../../types';

export function hasStructuredVariation(
  example: ScrapExampleMetric,
  literalShapeGroupSize = 0,
  fixtureGroupSize = 0
): boolean {
  return example.tableDriven === true ||
    literalShapeGroupSize > 1 ||
    fixtureGroupSize > 1;
}
