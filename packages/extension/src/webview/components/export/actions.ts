import { postMessage } from '../../vscodeApi';

export interface ExportActionItem {
  id: string;
  label: string;
  onSelect: () => void;
}

function postWindowMessage(type: string): () => void {
  return () => window.postMessage({ type }, '*');
}

export function buildImageItems(): ExportActionItem[] {
  return [
    {
      id: 'image:png',
      label: 'Export as PNG',
      onSelect: postWindowMessage('REQUEST_EXPORT_PNG'),
    },
    {
      id: 'image:svg',
      label: 'Export as SVG',
      onSelect: postWindowMessage('REQUEST_EXPORT_SVG'),
    },
    {
      id: 'image:jpeg',
      label: 'Export as JPEG',
      onSelect: postWindowMessage('REQUEST_EXPORT_JPEG'),
    },
  ];
}

export function buildGraphItems(): ExportActionItem[] {
  return [
    {
      id: 'graph:json',
      label: 'Export as JSON',
      onSelect: postWindowMessage('REQUEST_EXPORT_JSON'),
    },
    {
      id: 'graph:markdown',
      label: 'Export as Markdown',
      onSelect: postWindowMessage('REQUEST_EXPORT_MD'),
    },
    {
      id: 'graph:symbols',
      label: 'Export Symbols as JSON',
      onSelect: () => postMessage({ type: 'EXPORT_SYMBOLS_JSON' }),
    },
  ];
}

export function runPluginExport(pluginId: string, index: number): void {
  postMessage({
    type: 'RUN_PLUGIN_EXPORT',
    payload: {
      pluginId,
      index,
    },
  });
}
