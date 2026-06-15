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

export function activate(api: CodeGraphyWebviewAPI): () => void {
  injectStyles();

  let controlsRoot: Root | null = null;
  let canvasContainer: HTMLDivElement | null = null;
  let canvasCleanup: () => void = () => undefined;
  const refreshTimers: number[] = [];
  let customEffects: ParticleEffectAsset[] = [];
  let currentSettings = readParticleSettings(api);

  const renderControls = (): void => {
    if (!controlsRoot) {
      return;
    }

    flushSync(() => {
      controlsRoot?.render(
        <ParticlesSection
          settings={currentSettings}
          customEffects={customEffects}
          onSettingsChange={settings => updateSettings(settings, true)}
        />,
      );
    });
  };

  const renderCanvas = (): void => {
    if (!canvasContainer) {
      return;
    }

    canvasCleanup();
    canvasCleanup = renderParticleCanvas(canvasContainer, currentSettings, customEffects);
  };

  const updateSettings = (settings: ParticleSettings, persist = false): void => {
    currentSettings = normalizeParticleSettings(settings);
    renderControls();
    renderCanvas();
    if (persist) {
      api.setPluginData(currentSettings);
    }
  };

  const refreshFromPluginData = (): void => {
    const nextSettings = readParticleSettingsOrNull(api);
    if (nextSettings && !sameParticleSettings(currentSettings, nextSettings)) {
      updateSettings(nextSettings);
    }
  };

  const queuePluginDataRefresh = (): void => {
    refreshTimers.push(window.setTimeout(refreshFromPluginData, 0));
    refreshTimers.push(window.setTimeout(refreshFromPluginData, 100));
  };

  const controlsRegistration = api.registerSlotContribution('theme.panel', {
    id: 'particles.controls',
    order: 300,
    render(container) {
      controlsRoot = createRoot(container);
      renderControls();
      return () => {
        controlsRoot?.unmount();
        controlsRoot = null;
      };
    },
  });

  const canvasRegistration = api.registerSlotContribution('graph.stage.worldBackground', {
    id: 'particles.canvas',
    order: 0,
    render(container) {
      canvasContainer = container;
      renderCanvas();
      return () => {
        canvasCleanup();
        canvasCleanup = () => undefined;
        container.replaceChildren();
        canvasContainer = null;
      };
    },
  });

  queuePluginDataRefresh();

  const messageSubscription = api.onMessage((message) => {
    if (message.type === 'PLUGIN_WEBVIEW_ASSETS_UPDATED') {
      customEffects = readParticleEffectAssets(message.data);
      preloadCustomEffects(customEffects);
      refreshFromPluginData();
      renderControls();
      renderCanvas();
      return;
    }

    if (message.type !== 'PLUGIN_DATA_UPDATED') {
      return;
    }

    if (isParticleSettings(message.data)) {
      updateSettings(message.data);
    }
  });

  return () => {
    for (const timer of refreshTimers) {
      window.clearTimeout(timer);
    }
    messageSubscription.dispose();
    controlsRegistration.dispose();
    canvasRegistration.dispose();
    removeStyles();
  };
}

function preloadCustomEffects(customEffects: readonly ParticleEffectAsset[]): void {
  for (const effect of customEffects) {
    void import(/* @vite-ignore */ effect.url).catch((error: unknown) => {
      console.error(`[CodeGraphy] Failed to preload custom particle effect "${effect.label}":`, error);
    });
  }
}
