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

describe('getImage (mutation targets)', () => {
  it('returns the image element after load, not a different object', () => {
    getImage('https://example.com/icon.png');
    const img = capturedImages[0];
    img.onload?.(new Event('load'));

    const result = getImage('https://example.com/icon.png');
    expect(result).toBe(img);
    expect(result).not.toBeNull();
  });

  it('returns null while image is still loading on second call', () => {
    getImage('https://example.com/icon.png');
    // Don't fire onload
    const result = getImage('https://example.com/icon.png');
    expect(result).toBeNull();
  });

  it('returns null after error even on subsequent calls', () => {
    getImage('https://example.com/broken.png');
    capturedImages[0].onerror?.(new Event('error'));

    const result = getImage('https://example.com/broken.png');
    expect(result).toBeNull();
  });

  it('invokes onLoad callback exactly once when image loads', () => {
    const onLoad = vi.fn();
    getImage('https://example.com/icon.png', onLoad);
    capturedImages[0].onload?.(new Event('load'));

    expect(onLoad).toHaveBeenCalledOnce();
  });

  it('does not invoke onLoad callback when image errors', () => {
    const onLoad = vi.fn();
    getImage('https://example.com/broken.png', onLoad);
    capturedImages[0].onerror?.(new Event('error'));

    expect(onLoad).not.toHaveBeenCalled();
  });

  it('handles getImage without onLoad callback', () => {
    getImage('https://example.com/icon.png');
    // Should not throw when onload fires and there's no callback
    capturedImages[0].onload?.(new Event('load'));

    const result = getImage('https://example.com/icon.png');
    expect(result).toBe(capturedImages[0]);
  });

  it('sets src on the newly created image', () => {
    getImage('https://example.com/special.png');
    expect(capturedImages[0].src).toContain('special.png');
  });
});
