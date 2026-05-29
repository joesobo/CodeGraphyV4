export function normalizeFilterPattern(value: string): string {
	return value.trim();
}

export function canAddFilterPattern(value: string): boolean {
	return normalizeFilterPattern(value).length > 0;
}

export function toFilterGlob(path: string): string {
	const normalized = normalizeFilterPattern(path).replace(/^\/+/, '');
	if (!normalized) {
		return '';
	}

	return normalized.startsWith('**/') ? normalized : `**/${normalized}`;
}
