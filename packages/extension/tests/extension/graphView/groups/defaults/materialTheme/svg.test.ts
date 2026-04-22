import { Buffer } from 'node:buffer';
import { describe, expect, it } from 'vitest';
import { extractPrimaryColor, toSvgDataUrl, toWhiteSvgDataUrl } from '../../../../../../src/extension/graphView/groups/defaults/materialTheme/svg';

describe('graphView/materialTheme/svg', () => {
  it('extracts the most common hex color and falls back when none exist', () => {
    expect(extractPrimaryColor('<svg><path fill="#123456" /><path fill="#abcdef" /><path stroke="#abcdef" /></svg>')).toBe('#ABCDEF');
    expect(extractPrimaryColor('<svg />')).toBe('#90A4AE');
  });

  it('keeps the first color when counts tie and normalizes shorthand colors', () => {
    expect(extractPrimaryColor('<svg><path fill="#abc" /><path fill="#123456" /></svg>')).toBe('#AABBCC');
  });

  it('rewrites all hex colors to white in the generated data url', () => {
    const dataUrl = toWhiteSvgDataUrl('<svg><path fill="#123456" /><path stroke="#abc" /></svg>');
    const encoded = dataUrl.split(',')[1];
    const decoded = Buffer.from(encoded, 'base64').toString('utf8');

    expect(dataUrl).toMatch(/^data:image\/svg\+xml;base64,/);
    expect(decoded).toContain('#FFFFFF');
    expect(decoded).not.toContain('#123456');
    expect(decoded).not.toContain('#abc');
  });

  it('keeps original svg colors in the plain data url', () => {
    const dataUrl = toSvgDataUrl('<svg><path fill="#12345678" /></svg>');
    const encoded = dataUrl.split(',')[1];
    const decoded = Buffer.from(encoded, 'base64').toString('utf8');

    expect(decoded).toContain('#12345678');
  });
});
