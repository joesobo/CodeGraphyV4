import type { CodeGraphyWebviewAPI } from '@codegraphy-dev/plugin-api';
import { flushSync } from 'react-dom';
import { createRoot, type Root } from 'react-dom/client';
import { renderParticleCanvas } from './webview/canvas';
import {
  isParticleSettings,
  normalizeParticleSettings,
  readParticleEffectAssets,
  readParticleSettings,
  readParticleSettingsOrNull,
  sameParticleSettings,
  type ParticleEffectAsset,
  type ParticleSettings,
} from './webview/model';
import { injectStyles, removeStyles } from './webview/styles';
import { ParticlesSection } from './webview/view';

interface ActivationState {
  api: CodeGraphyWebviewAPI;
  canvasCleanup: () => void;
  canvasContainer: HTMLDivElement | null;
  controlsRoot: Root | null;
  currentSettings: ParticleSettings;
  customEffects: ParticleEffectAsset[];
  refreshTimers: number[];
}

export function activate(api: CodeGraphyWebviewAPI): () => void {
  injectStyles();

  const state: ActivationState = {
    api,
    canvasCleanup: () => undefined,
    canvasContainer: null,
    controlsRoot: null,
    currentSettings: readParticleSettings(api),
    customEffects: [],
    refreshTimers: [],
  };

  const controlsRegistration = registerControls(api, {
    getRoot: () => state.controlsRoot,
    renderControls: () => renderControls(state),
    setRoot: root => {
      state.controlsRoot = root;
    },
  });

  const canvasRegistration = registerCanvas(api, {
    clearCanvasCleanup: () => {
      state.canvasCleanup = () => undefined;
    },
    getCanvasCleanup: () => state.canvasCleanup,
    renderCanvas: () => renderCanvas(state),
    setCanvasContainer: container => {
      state.canvasContainer = container;
    },
  });

  queuePluginDataRefresh(state);

  const messageSubscription = api.onMessage((message) => {
    const handledCustomEffects = handleCustomEffectAssets(message, {
      refreshFromPluginData: () => refreshFromPluginData(state),
      renderCanvas: () => renderCanvas(state),
      renderControls: () => renderControls(state),
      setCustomEffects: effects => {
        state.customEffects = effects;
      },
    });
    if (handledCustomEffects) {
      return;
    }
    handlePluginDataUpdate(message, settings => updateSettings(state, settings));
  });

  return () => {
    for (const timer of state.refreshTimers) {
      window.clearTimeout(timer);
    }
    messageSubscription.dispose();
    controlsRegistration.dispose();
    canvasRegistration.dispose();
    removeStyles();
  };
}

function renderControls(state: ActivationState): void {
  if (!state.controlsRoot) {
    return;
  }

  flushSync(() => {
    state.controlsRoot?.render(
      <ParticlesSection
        settings={state.currentSettings}
        customEffects={state.customEffects}
        onSettingsChange={settings => updateSettings(state, settings, true)}
      />,
    );
  });
}

function renderCanvas(state: ActivationState): void {
  if (!state.canvasContainer) {
    return;
  }

  state.canvasCleanup();
  state.canvasCleanup = renderParticleCanvas(
    state.canvasContainer,
    state.currentSettings,
    state.customEffects,
  );
}

function updateSettings(
  state: ActivationState,
  settings: ParticleSettings,
  persist = false,
): void {
  state.currentSettings = normalizeParticleSettings(settings);
  renderControls(state);
  renderCanvas(state);
  if (persist) {
    state.api.setPluginData(state.currentSettings);
  }
}

function refreshFromPluginData(state: ActivationState): void {
  const nextSettings = readParticleSettingsOrNull(state.api);
  if (nextSettings && !sameParticleSettings(state.currentSettings, nextSettings)) {
    updateSettings(state, nextSettings);
  }
}

function queuePluginDataRefresh(state: ActivationState): void {
  state.refreshTimers.push(window.setTimeout(() => refreshFromPluginData(state), 0));
  state.refreshTimers.push(window.setTimeout(() => refreshFromPluginData(state), 100));
}

interface ControlsRegistrationHooks {
  getRoot(this: void): Root | null;
  renderControls(this: void): void;
  setRoot(this: void, root: Root | null): void;
}

function registerControls(
  api: CodeGraphyWebviewAPI,
  hooks: ControlsRegistrationHooks,
): ReturnType<CodeGraphyWebviewAPI['registerSlotContribution']> {
  return api.registerSlotContribution('theme.panel', {
    id: 'particles.controls',
    order: 300,
    render(container) {
      hooks.setRoot(createRoot(container));
      hooks.renderControls();
      return () => {
        hooks.getRoot()?.unmount();
        hooks.setRoot(null);
      };
    },
  });
}

interface CanvasRegistrationHooks {
  clearCanvasCleanup(this: void): void;
  getCanvasCleanup(this: void): () => void;
  renderCanvas(this: void): void;
  setCanvasContainer(this: void, container: HTMLDivElement | null): void;
}

function registerCanvas(
  api: CodeGraphyWebviewAPI,
  hooks: CanvasRegistrationHooks,
): ReturnType<CodeGraphyWebviewAPI['registerSlotContribution']> {
  return api.registerSlotContribution('graph.stage.worldBackground', {
    id: 'particles.canvas',
    order: 0,
    render(container) {
      hooks.setCanvasContainer(container);
      hooks.renderCanvas();
      return () => {
        hooks.getCanvasCleanup()();
        hooks.clearCanvasCleanup();
        container.replaceChildren();
        hooks.setCanvasContainer(null);
      };
    },
  });
}

interface CustomEffectAssetHooks {
  refreshFromPluginData(this: void): void;
  renderCanvas(this: void): void;
  renderControls(this: void): void;
  setCustomEffects(this: void, effects: ParticleEffectAsset[]): void;
}

function handleCustomEffectAssets(
  message: { type: string; data: unknown },
  hooks: CustomEffectAssetHooks,
): boolean {
  if (message.type !== 'PLUGIN_WEBVIEW_ASSETS_UPDATED') {
    return false;
  }

  const customEffects = readParticleEffectAssets(message.data);
  hooks.setCustomEffects(customEffects);
  preloadCustomEffects(customEffects);
  hooks.refreshFromPluginData();
  hooks.renderControls();
  hooks.renderCanvas();
  return true;
}

function handlePluginDataUpdate(
  message: { type: string; data: unknown },
  updateSettings: (settings: ParticleSettings) => void,
): void {
  if (message.type === 'PLUGIN_DATA_UPDATED' && isParticleSettings(message.data)) {
    updateSettings(message.data);
  }
}

function preloadCustomEffects(customEffects: readonly ParticleEffectAsset[]): void {
  for (const effect of customEffects) {
    void import(/* @vite-ignore */ effect.url).catch((error: unknown) => {
      console.error(`[CodeGraphy] Failed to preload custom particle effect "${effect.label}":`, error);
    });
  }
}
