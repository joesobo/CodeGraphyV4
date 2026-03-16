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

describe('getImage', () => {
  it('returns null on first call while loading', () => {
    const result = getImage('https://example.com/icon.png');
    expect(result).toBeNull();
  });

  it('creates an Image and sets its src', () => {
    getImage('https://example.com/icon.png');
    expect(capturedImages).toHaveLength(1);
    expect(capturedImages[0].src).toContain('icon.png');
  });

  it('returns the cached image after onload fires', () => {
    getImage('https://example.com/icon.png');
    const img = capturedImages[0];

    // Simulate the browser finishing the load
    img.onload?.(new Event('load'));

    const result = getImage('https://example.com/icon.png');
    expect(result).toBe(img);
  });

  it('calls the onLoad callback when the image loads', () => {
    const onLoad = vi.fn();
    getImage('https://example.com/icon.png', onLoad);
    const img = capturedImages[0];

    expect(onLoad).not.toHaveBeenCalled();
    img.onload?.(new Event('load'));
    expect(onLoad).toHaveBeenCalledOnce();
  });

  it('returns null after onerror fires', () => {
    getImage('https://example.com/broken.png');
    const img = capturedImages[0];

    img.onerror?.(new Event('error'));

    const result = getImage('https://example.com/broken.png');
    expect(result).toBeNull();
  });

  it('does not duplicate requests for the same URL', () => {
    getImage('https://example.com/icon.png');
    getImage('https://example.com/icon.png');
    getImage('https://example.com/icon.png');

    expect(capturedImages).toHaveLength(1);
  });

  it('creates separate entries for different URLs', () => {
    getImage('https://example.com/a.png');
    getImage('https://example.com/b.png');

    expect(capturedImages).toHaveLength(2);
  });

  it('returns correct image for each URL after both load', () => {
    getImage('https://example.com/a.png');
    getImage('https://example.com/b.png');

    capturedImages[0].onload?.(new Event('load'));
    capturedImages[1].onload?.(new Event('load'));

    expect(getImage('https://example.com/a.png')).toBe(capturedImages[0]);
    expect(getImage('https://example.com/b.png')).toBe(capturedImages[1]);
  });

  it('still returns null while loading even with onLoad callback', () => {
    const onLoad = vi.fn();
    const result = getImage('https://example.com/icon.png', onLoad);
    expect(result).toBeNull();
    expect(onLoad).not.toHaveBeenCalled();
  });
});

describe('clearImageCache', () => {
  it('resets loaded entries so getImage starts fresh', () => {
    getImage('https://example.com/icon.png');
    capturedImages[0].onload?.(new Event('load'));

    // Verify it was cached
    expect(getImage('https://example.com/icon.png')).toBe(capturedImages[0]);

    clearImageCache();

    // After clearing, same URL should return null and create a new Image
    const result = getImage('https://example.com/icon.png');
    expect(result).toBeNull();
    expect(capturedImages).toHaveLength(2);
  });

  it('resets errored entries', () => {
    getImage('https://example.com/broken.png');
    capturedImages[0].onerror?.(new Event('error'));

    clearImageCache();

    // Should start a new load attempt
    getImage('https://example.com/broken.png');
    expect(capturedImages).toHaveLength(2);
  });
});
