export function isFiniteNumber(value: unknown): value is number {
	return Number.isFinite(value);
}

export function isFinitePositiveNumber(value: unknown): value is number {
	return isFiniteNumber(value) && value > 0;
}

export function isFinitePair(value: unknown): value is [number, number] {
	return Array.isArray(value)
		&& value.length === 2
		&& value.every(isFiniteNumber);
}

export function clamp(value: number, minimum: number, maximum: number): number {
	if (minimum > maximum) {
		return (minimum + maximum) / 2;
	}

	return Math.max(minimum, Math.min(maximum, value));
}

export function resolveNodeCoordinate(value: unknown, fallback: number): number {
	return isFiniteNumber(value) ? value : fallback;
}

export function getFiniteVelocity(value: number | undefined): number {
	return isFiniteNumber(value) ? value : 0;
}
