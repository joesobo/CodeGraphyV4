export interface FilterPatternSources {
	disabledCustomPatterns: readonly string[];
	disabledPluginPatterns: readonly string[];
	customPatterns: readonly string[];
	pluginPatterns: readonly string[];
	respectFilesExclude?: boolean;
}

export function getEnabledFilterPatterns({
	disabledCustomPatterns,
	disabledPluginPatterns,
	customPatterns,
	pluginPatterns,
}: FilterPatternSources): string[] {
	const disabledCustom = new Set(disabledCustomPatterns);
	const disabledPlugin = new Set(disabledPluginPatterns);

	return [
		...pluginPatterns.filter(pattern => !disabledPlugin.has(pattern)),
		...customPatterns.filter(pattern => !disabledCustom.has(pattern)),
	];
}

export function getEnabledFilterCount(sources: FilterPatternSources): number {
	return getEnabledFilterPatterns(sources).length + (sources.respectFilesExclude ? 1 : 0);
}
