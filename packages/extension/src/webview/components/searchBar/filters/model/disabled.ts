export function getDisabledFilterPatterns(
	currentPatterns: readonly string[],
	pattern: string,
	enabled: boolean,
): string[] {
	const current = new Set(currentPatterns);
	if (enabled) {
		current.delete(pattern);
	} else {
		current.add(pattern);
	}

	return Array.from(current);
}

export function getDisabledFilterPatternGroup(
	currentPatterns: readonly string[],
	groupPatterns: readonly string[],
	enabled: boolean,
): string[] {
	const group = new Set(groupPatterns);
	if (enabled) {
		return currentPatterns.filter(pattern => !group.has(pattern));
	}

	return Array.from(new Set([...currentPatterns, ...groupPatterns]));
}
