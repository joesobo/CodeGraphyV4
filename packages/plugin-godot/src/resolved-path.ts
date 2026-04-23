import * as path from 'path';
import { normalizePath } from './parser';

interface IMaterializeResolvedPathOptions {
	projectRoot: string;
	resolvedPath: string;
	workspaceRoot: string;
}

export function materializeResolvedPath(
	options: IMaterializeResolvedPathOptions,
): string {
	const { projectRoot, resolvedPath, workspaceRoot } = options;
	const normalizedResolvedPath = normalizePath(resolvedPath);

	if (path.isAbsolute(normalizedResolvedPath)) {
		return normalizedResolvedPath;
	}

	const projectRelativePrefix = normalizePath(path.relative(workspaceRoot, projectRoot));
	if (!projectRelativePrefix) {
		return normalizePath(path.join(workspaceRoot, normalizedResolvedPath));
	}

	const isWorkspaceRelativeToProject =
		normalizedResolvedPath === projectRelativePrefix
		|| normalizedResolvedPath.startsWith(`${projectRelativePrefix}/`);

	return normalizePath(
		path.join(
			isWorkspaceRelativeToProject ? workspaceRoot : projectRoot,
			normalizedResolvedPath,
		),
	);
}
