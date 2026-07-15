import { webGpuCiLaunchArgs } from './webGpuLaunch';
import type { ScenarioProfile } from './scenarioProfile';

export function scenarioLaunchArgs(profile: ScenarioProfile): string[] {
  return [
    profile.workspacePath,
    ...webGpuCiLaunchArgs({ ci: process.env.CI === 'true', platform: process.platform }),
    '--user-data-dir',
    profile.userDataPath,
    '--extensions-dir',
    profile.extensionsPath,
    '--use-inmemory-secretstorage',
    '--sync',
    'off',
    '--disable-telemetry',
    '--disable-updates',
    '--disable-workspace-trust',
    '--disable-extensions',
    '--skip-welcome',
    '--skip-release-notes',
  ];
}
