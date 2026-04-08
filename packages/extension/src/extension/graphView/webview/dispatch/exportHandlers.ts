import { saveExportedJpeg } from '../../../export/saveJpeg';
import { saveExportedJson } from '../../../export/saveJson';
import { saveExportedMarkdown } from '../../../export/saveMarkdown';
import { saveExportedPng } from '../../../export/savePng';
import { saveExportedSvg } from '../../../export/saveSvg';

export function createGraphViewPrimaryExportHandlers() {
  return {
    savePng: saveExportedPng,
    saveSvg: saveExportedSvg,
    saveJpeg: saveExportedJpeg,
    saveJson: saveExportedJson,
    saveMarkdown: saveExportedMarkdown,
  };
}
