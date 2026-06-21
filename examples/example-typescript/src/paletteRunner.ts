import { BaseGenerator } from './baseGenerator';
import type { PaletteExporter } from './paletteExporter';

export class PaletteRunner extends BaseGenerator implements PaletteExporter {
  exportPalette(mood: string): string {
    return this.markGenerated(mood);
  }
}
