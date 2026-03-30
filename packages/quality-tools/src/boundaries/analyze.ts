import { existsSync } from 'fs';
import { basename, dirname, join } from 'path';
import { matchesGlob } from 'path';
import { parseFileImports } from '../organize/cohesion/parse';
import { walkDirectories } from '../organize/metric/directoryWalk';
import { pathIncludedByTool, resolvePackageBoundaryConfig } from '../config/quality';
import { toPosix } from '../shared/util/pathUtils';
import type { QualityTarget } from '../shared/resolve/target';
import { listWorkspacePackages, type WorkspacePackage } from '../shared/util/workspacePackages';
import type {
  BoundaryFileNode,
  BoundaryLayerRule,
  BoundaryReport,
  BoundaryViolation
} from './types';

type FileIndex = Map<string, BoundaryFileNode>;

function isRelativeImport(specifier: string): boolean {
  return specifier.startsWith('.');
}

function resolveImportTarget(
  fromFile: string,
  specifier: string,
  candidatePaths: Set<string>
): string | undefined {
  if (!isRelativeImport(specifier)) {
    return undefined;
  }

  const basePath = join(dirname(fromFile), specifier);
  const candidates = [
    basePath,
    `${basePath}.ts`,
    `${basePath}.tsx`,
    `${basePath}.js`,
    `${basePath}.jsx`,
    join(basePath, 'index.ts'),
    join(basePath, 'index.tsx'),
    join(basePath, 'index.js'),
    join(basePath, 'index.jsx')
  ];

  return candidates.find((candidate) => candidatePaths.has(candidate));
}

function resolvePackageCandidates(
  repoRoot: string,
  workspacePackage: WorkspacePackage
): string[] {
  const entries = walkDirectories(workspacePackage.root);
  const selected: string[] = [];

  for (const entry of entries) {
    for (const fileName of entry.files) {
      const absolutePath = join(entry.directoryPath, fileName);
      const packageRelativePath = toPosix(absolutePath.slice(workspacePackage.root.length + 1));
      if (
        pathIncludedByTool(
          repoRoot,
          workspacePackage.name,
          'boundaries',
          packageRelativePath
        )
      ) {
        selected.push(absolutePath);
      }
    }
  }

  return selected.sort();
}

function layerForPath(
  packageRelativePath: string | undefined,
  layers: BoundaryLayerRule[]
): BoundaryLayerRule | undefined {
  if (!packageRelativePath) {
    return undefined;
  }

  return layers.find((layer) => layer.include.some((pattern) => matchesGlob(packageRelativePath, pattern)));
}

function isEntrypoint(packageRelativePath: string | undefined, entrypoints: string[]): boolean {
  if (!packageRelativePath) {
    return false;
  }

  return entrypoints.some((pattern) => matchesGlob(packageRelativePath, pattern));
}

function createNode(
  repoRoot: string,
  workspacePackage: WorkspacePackage,
  absolutePath: string,
  layers: BoundaryLayerRule[],
  entrypoints: string[]
): BoundaryFileNode {
  const packageRelativePath = toPosix(absolutePath.slice(workspacePackage.root.length + 1));
  const layer = layerForPath(packageRelativePath, layers);

  return {
    absolutePath,
    entrypoint: isEntrypoint(packageRelativePath, entrypoints),
    incoming: 0,
    layer: layer?.name,
    outgoing: 0,
    packageName: workspacePackage.name,
    packageRelativePath,
    relativePath: toPosix(absolutePath.slice(repoRoot.length + 1))
  };
}

function analyzePackage(repoRoot: string, workspacePackage: WorkspacePackage): BoundaryReport {
  const config = resolvePackageBoundaryConfig(repoRoot, workspacePackage.name);
  const selectedPaths = resolvePackageCandidates(repoRoot, workspacePackage);
  const candidatePaths = new Set(selectedPaths);
  const nodesByPath: FileIndex = new Map(
    selectedPaths.map((absolutePath) => [
      absolutePath,
      createNode(repoRoot, workspacePackage, absolutePath, config.layers, config.entrypoints)
    ])
  );
  const violations: BoundaryViolation[] = [];

  for (const absolutePath of selectedPaths) {
    const node = nodesByPath.get(absolutePath);
    if (!node) {
      continue;
    }

    const imports = parseFileImports(absolutePath, basename(absolutePath));
    for (const specifier of imports) {
      const resolvedImport = resolveImportTarget(absolutePath, specifier, candidatePaths);
      if (!resolvedImport) {
        continue;
      }

      const importedNode = nodesByPath.get(resolvedImport);
      if (!importedNode) {
        continue;
      }

      node.outgoing += 1;
      importedNode.incoming += 1;

      if (
        node.layer &&
        importedNode.layer &&
        node.layer !== importedNode.layer &&
        !config.layers.find((layer) => layer.name === node.layer)?.allow.includes(importedNode.layer)
      ) {
        violations.push({
          from: node.relativePath,
          fromLayer: node.layer,
          reason: `${node.layer} cannot depend on ${importedNode.layer}`,
          to: importedNode.relativePath,
          toLayer: importedNode.layer
        });
      }
    }
  }

  const files = [...nodesByPath.values()].sort((left, right) => left.relativePath.localeCompare(right.relativePath));
  const deadEnds = files.filter((file) => file.incoming === 0 && file.outgoing === 0 && !file.entrypoint);
  const deadSurfaces = files.filter((file) => file.incoming === 0 && file.outgoing > 0 && !file.entrypoint);

  return {
    deadEnds,
    deadSurfaces,
    files,
    layerViolations: violations,
    target: `packages/${workspacePackage.name}`
  };
}

function analyzePackageRoot(repoRoot: string, workspacePackage: WorkspacePackage): BoundaryReport {
  return analyzePackage(repoRoot, workspacePackage);
}

function mergeReports(target: string, reports: BoundaryReport[]): BoundaryReport {
  const files: BoundaryFileNode[] = [];
  const deadEnds: BoundaryFileNode[] = [];
  const deadSurfaces: BoundaryFileNode[] = [];
  const layerViolations: BoundaryViolation[] = [];

  for (const report of reports) {
    files.push(...report.files);
    deadEnds.push(...report.deadEnds);
    deadSurfaces.push(...report.deadSurfaces);
    layerViolations.push(...report.layerViolations);
  }

  return {
    deadEnds,
    deadSurfaces,
    files,
    layerViolations,
    target
  };
}

export function analyzeBoundaries(repoRoot: string, target: QualityTarget): BoundaryReport {
  if (target.kind === 'repo') {
    return mergeReports(
      'packages',
      listWorkspacePackages(repoRoot).map((workspacePackage) => analyzePackageRoot(repoRoot, workspacePackage))
    );
  }

  if (target.packageName) {
    return analyzePackageRoot(repoRoot, {
      name: target.packageName,
      root: target.packageRoot ?? join(repoRoot, 'packages', target.packageName)
    });
  }

  if (existsSync(target.absolutePath)) {
    const workspacePackage = {
      name: target.absolutePath.split('/').pop() ?? 'target',
      root: target.absolutePath
    };
    return analyzePackageRoot(repoRoot, workspacePackage);
  }

  return {
    deadEnds: [],
    deadSurfaces: [],
    files: [],
    layerViolations: [],
    target: target.relativePath
  };
}
