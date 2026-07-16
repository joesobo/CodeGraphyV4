import type { IGroup } from '../../../../../../shared/settings/groups';
import { SHAPE_OPTIONS } from './options';
import type { ShapeOption } from './types';

export function getShapeOption(rule: IGroup): ShapeOption {
  return SHAPE_OPTIONS.find((option) => option.shape2D === rule.shape2D) ?? SHAPE_OPTIONS[0];
}

export function applyShape(rule: IGroup, option: ShapeOption): IGroup {
  return {
    ...rule,
    shape2D: option.shape2D,
  };
}
