import { saveExportedJpeg } from '../../../export/saveJpeg';
import { saveExportedJson } from '../../../export/saveJson';
import { saveExportedMarkdown } from '../../../export/saveMarkdown';
import { saveExportedPng } from '../../../export/savePng';
import { saveExportedSvg } from '../../../export/saveSvg';
import {
  buildSymbolsExportData,
  buildSymbolsExportDataFromSnapshot,
} from '../../../export/symbols/build';
import { saveExportedSymbolsJson } from '../../../export/symbols/save';
import type { GraphViewPrimaryMessageContext } from './primary';

export function createGraphViewPrimaryExportHandlers(context: Pick<GraphViewPrimaryMessageContext, 'getAnalyzer'>) {
  return {
    savePng: saveExportedPng,
    saveSvg: saveExportedSvg,
    saveJpeg: saveExportedJpeg,
    saveJson: saveExportedJson,
    saveMarkdown: saveExportedMarkdown,
    exportSymbolsJson: async () => {
      const analyzer = context.getAnalyzer();
      const snapshot = analyzer?.readStructuredAnalysisSnapshot?.();
      const exportData = snapshot && snapshot.files.length > 0
        ? buildSymbolsExportDataFromSnapshot(snapshot)
        : buildSymbolsExportData(analyzer?.lastFileAnalysis ?? new Map());
      const timestamp = new Date().toISOString().replace(/:/g, '-');
      await saveExportedSymbolsJson(
        JSON.stringify(exportData, null, 2),
        `codegraphy-symbols-${timestamp}.json`,
      );
    },
  };
}
