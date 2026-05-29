const MAX_BADGE_COUNT = 99;

export function formatCollapsedDescendantCount(count: number | undefined): string {
	if (!count || count < 1) {
		return '';
	}

	return count > MAX_BADGE_COUNT ? `${MAX_BADGE_COUNT}+` : String(count);
}
