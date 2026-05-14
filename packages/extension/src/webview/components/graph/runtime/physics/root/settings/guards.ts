import type { GraphCollisionForceControls } from '../../model';

export function hasRadius(value: unknown): value is GraphCollisionForceControls {
	return !!value && typeof (value as GraphCollisionForceControls).radius === 'function';
}
