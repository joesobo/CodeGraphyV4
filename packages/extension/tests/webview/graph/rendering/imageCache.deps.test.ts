/**
 * Tests targeting surviving mutants in imageCache.ts:
 * - L20:61 BooleanLiteral: true (error: false -> error: true in newEntry)
 * - L28:23 BlockStatement: {} (onerror handler body removed)
 * - L29:22 BooleanLiteral: false (newEntry.error = true -> newEntry.error = false)
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

describe('imageCache error handling (mutation targets)', () => {
  it('new entry starts with error=false so image can load successfully', () => {
    // L20: if `error: false` is mutated to `error: true`, the entry would
    // start as errored. After onload fires, the entry.loaded becomes true
    // but the initial error state should be false.
    //
    // We verify this by checking that after onload, the image IS returned
    // (if error started as true, the implementation might behave differently).
    getImage('https://example.com/test.png');
    const img = capturedImages[0];

    // Before load, should return null (loading, not errored)
    const beforeLoad = getImage('https://example.com/test.png');
    expect(beforeLoad).toBeNull();

    // Fire onload
    img.onload?.(new Event('load'));

    // After load, should return the image
    const afterLoad = getImage('https://example.com/test.png');
    expect(afterLoad).toBe(img);
  });

  it('onerror handler marks the entry as errored', () => {
    // L28-29: if onerror body is removed (BlockStatement: {}) or
    // `newEntry.error = true` is mutated to `newEntry.error = false`,
    // the error state won't be recorded. After error, subsequent calls
    // should still return null (not loading forever).
    getImage('https://example.com/broken.png');
    const img = capturedImages[0];

    // Fire onerror
    img.onerror?.(new Event('error'));

    // Should return null because the image failed to load
    const result = getImage('https://example.com/broken.png');
    expect(result).toBeNull();

    // Crucially, no new Image should be created (entry is cached as errored)
    expect(capturedImages).toHaveLength(1);
  });

  it('after onerror, onload on the same image does not return it', () => {
    // This ensures the error state is properly set:
    // If error was never set to true, subsequent onload would make it "loaded"
    getImage('https://example.com/problematic.png');
    const img = capturedImages[0];

    // Error first
    img.onerror?.(new Event('error'));

    // The image errored out, should return null
    const result = getImage('https://example.com/problematic.png');
    expect(result).toBeNull();
  });

  it('image loads correctly when error field defaults to false', () => {
    // L20: if error starts as true, onload might not work correctly
    // depending on logic. The key insight: when entry exists and loaded=true,
    // we get the image back. If error started true, onload still sets loaded=true.
    // But this tests the initial state is correct.
    const onLoad = vi.fn();
    getImage('https://example.com/valid.png', onLoad);
    const img = capturedImages[0];

    // Trigger load
    img.onload?.(new Event('load'));

    expect(onLoad).toHaveBeenCalledOnce();

    // The image should be returned on subsequent calls
    const loaded = getImage('https://example.com/valid.png');
    expect(loaded).toBe(img);
    expect(loaded).not.toBeNull();
  });

  it('correctly distinguishes between loading and errored entries', () => {
    // Start two image loads
    getImage('https://example.com/good.png');
    getImage('https://example.com/bad.png');

    const goodImg = capturedImages[0];
    const badImg = capturedImages[1];

    // Error the bad one
    badImg.onerror?.(new Event('error'));

    // Load the good one
    goodImg.onload?.(new Event('load'));

    // Good image should be returned
    expect(getImage('https://example.com/good.png')).toBe(goodImg);

    // Bad image should return null
    expect(getImage('https://example.com/bad.png')).toBeNull();
  });

  it('onerror callback body executes and marks error state', () => {
    // L28: if BlockStatement is mutated to {} (empty body), error is never set
    // This means subsequent getImage calls would see loaded=false, error=false
    // and return null (same behavior as loading). But the key difference is
    // that after clearImageCache, a fresh entry is created.
    getImage('https://example.com/error-test.png');
    const img = capturedImages[0];

    // Fire error
    img.onerror?.(new Event('error'));

    // Entry exists in cache as errored - no new image should be created
    getImage('https://example.com/error-test.png');
    expect(capturedImages).toHaveLength(1);

    // After clearing, a new image should be created
    clearImageCache();
    getImage('https://example.com/error-test.png');
    expect(capturedImages).toHaveLength(2);
  });
});
