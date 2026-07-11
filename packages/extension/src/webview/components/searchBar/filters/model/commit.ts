import { postMessage } from '../../../../vscodeApi';

export function commitFilterPatterns(patterns: string[]): void {
	postMessage({ type: 'UPDATE_FILTER_PATTERNS', payload: { patterns } });
}

export function commitFilterPatternState(
	source: 'custom' | 'plugin',
	pattern: string,
	enabled: boolean,
): void {
	postMessage({ type: 'UPDATE_FILTER_PATTERN_STATE', payload: { source, pattern, enabled } });
}

export function commitFilterPatternGroupState(
	source: 'custom' | 'plugin',
	enabled: boolean,
): void {
	postMessage({ type: 'UPDATE_FILTER_PATTERN_GROUP_STATE', payload: { source, enabled } });
}

export function commitRespectFilesExclude(enabled: boolean): void {
	postMessage({ type: 'UPDATE_RESPECT_FILES_EXCLUDE', payload: { enabled } });
}
