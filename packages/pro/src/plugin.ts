import type {
  CodeGraphyAccessKey,
  CodeGraphyAccessState,
  IAccessProvider,
  IAccessResult,
  IPlugin,
} from '@codegraphy/plugin-api';
import manifest from '../codegraphy.json';

const ORGANIZE_ACCESS = 'organize' as CodeGraphyAccessKey;

export type ProPlan = 'free' | 'pro' | 'team' | 'unknown';

export interface ProAccountStatus {
  signedIn: boolean;
  plan: ProPlan;
  access: Partial<Record<CodeGraphyAccessKey, CodeGraphyAccessState>>;
}

export interface ProPluginOptions {
  getAccountStatus?(): ProAccountStatus | Promise<ProAccountStatus>;
}

const DISCONNECTED_STATUS: ProAccountStatus = {
  signedIn: false,
  plan: 'unknown',
  access: {},
};

async function readAccountStatus(options: ProPluginOptions): Promise<ProAccountStatus> {
  return await options.getAccountStatus?.() ?? DISCONNECTED_STATUS;
}

function createAccessResult(
  requestAccess: CodeGraphyAccessKey,
  state: CodeGraphyAccessState,
): IAccessResult {
  if (state === 'missing') {
    return {
      access: requestAccess,
      state,
      reason: 'CodeGraphy Pro account is not connected.',
    };
  }

  return {
    access: requestAccess,
    state,
  };
}

function createProAccessProvider(options: ProPluginOptions): IAccessProvider {
  return {
    id: 'codegraphy.pro.access',
    provides: [ORGANIZE_ACCESS],
    async getAccess(request): Promise<IAccessResult> {
      const status = await readAccountStatus(options);
      const state = status.access[request.access] ?? 'missing';
      return createAccessResult(request.access, state);
    },
  };
}

export function createProPlugin(options: ProPluginOptions = {}): IPlugin {
  return {
    id: manifest.id,
    name: manifest.name,
    version: manifest.version,
    apiVersion: manifest.apiVersion,
    supportedExtensions: manifest.supportedExtensions,
    defaultFilters: manifest.defaultFilters,
    fileColors: manifest.fileColors,
    accessProvider: createProAccessProvider(options),
    graphView: {
      ui: [
        {
          id: 'codegraphy.pro.account-toolbar',
          label: 'CodeGraphy Pro Account',
          slot: 'graph.toolbar',
          view: { kind: 'command', command: 'codegraphy.pro.account.toggle' },
        },
        {
          id: 'codegraphy.pro.account-panel',
          label: 'CodeGraphy Pro Account',
          slot: 'graph.panelSlot',
          view: { kind: 'panel', panelId: 'codegraphy.pro.account' },
        },
      ],
    },
  };
}

export default createProPlugin;
