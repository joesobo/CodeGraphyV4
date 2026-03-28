/**
 * Tests for imageCache.ts edge cases.
 * The error field was removed (dead code — set but never read), so
 * remaining tests verify loading and caching behavior.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getImage, clearImageCache } from '../../../../src/webview/components/graph/rendering/imageCache';

let capturedImages: HTMLImageElement[];

beforeEach(() => {
  clearImageCache();
  capturedImages = [];

  vi.stubGlobal(
    'Image',
    class MockImage {
      constructor() {
        const img = document.createElement('img') as HTMLImageElement;
        capturedImages.push(img);
        return img;
      }
    }
  );
});

describe('imageCache caching behavior', () => {
  it('returns the image after onload fires', () => {
    getImage('https://example.com/test.png');
    const img = capturedImages[0];

    const beforeLoad = getImage('https://example.com/test.png');
    expect(beforeLoad).toBeNull();

    img.onload?.(new Event('load'));

    const afterLoad = getImage('https://example.com/test.png');
    expect(afterLoad).toBe(img);
  });

  it('returns null for a pending entry on subsequent calls', () => {
    getImage('https://example.com/broken.png');

    const result = getImage('https://example.com/broken.png');
    expect(result).toBeNull();
    expect(capturedImages).toHaveLength(1);
  });

  it('image loads correctly and invokes the callback', () => {
    const onLoad = vi.fn();
    getImage('https://example.com/valid.png', onLoad);
    const img = capturedImages[0];

    img.onload?.(new Event('load'));

    expect(onLoad).toHaveBeenCalledOnce();

    const loaded = getImage('https://example.com/valid.png');
    expect(loaded).toBe(img);
    expect(loaded).not.toBeNull();
  });

  it('correctly distinguishes between loaded and pending entries', () => {
    getImage('https://example.com/good.png');
    getImage('https://example.com/pending.png');

    const goodImg = capturedImages[0];

    goodImg.onload?.(new Event('load'));

    expect(getImage('https://example.com/good.png')).toBe(goodImg);
    expect(getImage('https://example.com/pending.png')).toBeNull();
  });

  it('creates a fresh entry after clearing the cache', () => {
    getImage('https://example.com/test.png');
    capturedImages[0].onload?.(new Event('load'));

    expect(getImage('https://example.com/test.png')).toBe(capturedImages[0]);

    clearImageCache();
    getImage('https://example.com/test.png');
    expect(capturedImages).toHaveLength(2);
  });
});
