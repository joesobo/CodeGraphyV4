import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { pathToFileURL } from 'node:url';
import type { CodeGraphyInstalledPluginRecord } from './installedCache';
import { createPluginFromModule } from './packageModule';
import { createPackagePluginFactoryInvocation } from './packageOptions';
import { resolvePackageEntrypoint } from './packageEntrypoint';
import type {
  LoadedCodeGraphyWorkspacePluginPackage,
  PackageJsonWithEntrypoint,
} from './packageRuntimeContracts';
import type { CodeGraphyWorkspacePluginSettings } from '../workspace/settings';
import { CODEGRAPHY_CORE_VERSION } from './api';
import { compareSemver, parseSemver } from './apiVersion';
import { captureActivePerfMetricEmitter } from '../diagnostics/perfMetrics';

function getStaticPluginId(record: CodeGraphyInstalledPluginRecord): string {
  return record.pluginId ?? record.package;
}

function validateRuntimePluginId(
  pluginId: string,
  record: CodeGraphyInstalledPluginRecord,
): void {
  const staticPluginId = getStaticPluginId(record);
  if (pluginId !== staticPluginId) {
    throw new Error(
      `Package '${record.package}' exported plugin id '${pluginId}', but codegraphy.json declares '${staticPluginId}'.`,
    );
  }
}

function assertCoreVersionCompatibility(record: CodeGraphyInstalledPluginRecord): void {
  if (!record.minCoreVersion) return;
  const host = parseSemver(CODEGRAPHY_CORE_VERSION);
  const minimum = parseSemver(record.minCoreVersion);
  if (!minimum) {
    throw new Error(
      `codegraphy.json declares invalid minCoreVersion '${record.minCoreVersion}'.`,
    );
  }
  if (!host || compareSemver(host, minimum) < 0) {
    throw new Error(
      `requires CodeGraphy Core ${record.minCoreVersion} or newer; `
      + `this host provides ${CODEGRAPHY_CORE_VERSION}.`,
    );
  }
}

export async function loadCodeGraphyWorkspacePluginPackage(
  settings: CodeGraphyWorkspacePluginSettings,
  record: CodeGraphyInstalledPluginRecord,
  workspaceRoot?: string,
): Promise<LoadedCodeGraphyWorkspacePluginPackage> {
  const emitPerfMetric = captureActivePerfMetricEmitter();
  const activationStartedAt = performance.now();
  assertCoreVersionCompatibility(record);
  const packageJson = JSON.parse(
    await fs.readFile(path.join(record.packageRoot, 'package.json'), 'utf-8'),
  ) as PackageJsonWithEntrypoint;
  const modulePath = resolvePackageEntrypoint(record.packageRoot, packageJson);
  const moduleNamespace: unknown = await import(pathToFileURL(modulePath).href);
  const { invocation, options } = createPackagePluginFactoryInvocation(record, settings, workspaceRoot);
  const plugin = await createPluginFromModule(moduleNamespace, record.package, invocation);
  validateRuntimePluginId(plugin.id, record);
  emitPerfMetric?.({
    metric: 'pluginActivationMs',
    unit: 'ms',
    value: performance.now() - activationStartedAt,
    dimension: plugin.id,
  });

  return {
    plugin,
    packageName: record.package,
    record,
    ...(options ? { options } : {}),
  };
}
