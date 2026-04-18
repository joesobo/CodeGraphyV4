import type { WebviewToExtensionMessage } from '../../../../shared/protocol/webviewToExtension';

export interface GraphViewExportHandlers {
  savePng(dataUrl: string, filename?: string): Promise<void>;
  saveSvg(svg: string, filename?: string): Promise<void>;
  saveJpeg(dataUrl: string, filename?: string): Promise<void>;
  saveJson(json: string, filename?: string): Promise<void>;
  saveMarkdown(markdown: string, filename?: string): Promise<void>;
  exportSymbolsJson(): Promise<void>;
}

export async function applyExportMessage(
  message: WebviewToExtensionMessage,
  handlers: GraphViewExportHandlers,
): Promise<boolean> {
  switch (message.type) {
    case 'EXPORT_PNG':
      await handlers.savePng(message.payload.dataUrl, message.payload.filename);
      return true;

    case 'EXPORT_SVG':
      await handlers.saveSvg(message.payload.svg, message.payload.filename);
      return true;

    case 'EXPORT_JPEG':
      await handlers.saveJpeg(message.payload.dataUrl, message.payload.filename);
      return true;

    case 'EXPORT_JSON':
      await handlers.saveJson(message.payload.json, message.payload.filename);
      return true;

    case 'EXPORT_MD':
      await handlers.saveMarkdown(message.payload.markdown, message.payload.filename);
      return true;

    case 'EXPORT_SYMBOLS_JSON':
      await handlers.exportSymbolsJson();
      return true;

    default:
      return false;
  }
}
