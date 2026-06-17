import { describe, expect, it } from 'vitest';
import { buildUnityGuidMap, readUnityGuid } from '../src/guidMap';

describe('Unity GUID map', () => {
  it('reads Unity .meta GUIDs', () => {
    expect(readUnityGuid([
      'fileFormatVersion: 2',
      'guid: abcdef0123456789abcdef0123456789',
      'MonoImporter:',
    ].join('\n'))).toBe('abcdef0123456789abcdef0123456789');
  });

  it('maps GUIDs to their asset paths', () => {
    const guidToAssetPath = buildUnityGuidMap([
      {
        absolutePath: '/workspace/Assets/Scripts/Player/PlayerController.cs.meta',
        relativePath: 'Assets/Scripts/Player/PlayerController.cs.meta',
        content: 'guid: abcdef0123456789abcdef0123456789',
      },
    ]);

    expect(guidToAssetPath.get('abcdef0123456789abcdef0123456789'))
      .toBe('Assets/Scripts/Player/PlayerController.cs');
  });
});
