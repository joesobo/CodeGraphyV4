import { beforeEach, describe, expect, it, vi } from 'vitest';
import { resolveRustUsePath } from '../../../../src/extension/pipeline/plugins/treesitter/runtime/analyze/rust/usePath';
import { findExistingFile } from '../../../../src/extension/pipeline/plugins/treesitter/runtime/analyze/existingFile';
import { getRustCrateRoot } from '../../../../src/extension/pipeline/plugins/treesitter/runtime/projectRoots';

vi.mock('../../../../src/extension/pipeline/plugins/treesitter/runtime/analyze/existingFile', () => ({
  findExistingFile: vi.fn(),
}));

vi.mock('../../../../src/extension/pipeline/plugins/treesitter/runtime/projectRoots', () => ({
  getRustCrateRoot: vi.fn(),
}));

describe('extension/pipeline/plugins/treesitter/runtime/analyze/rust/usePath', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getRustCrateRoot).mockReturnValue('/workspace/crate');
  });

  it('returns null when the specifier does not contain a usable module segment', () => {
    expect(resolveRustUsePath('/workspace/crate/src/lib.rs', '/workspace', '::')).toBeNull();
    expect(findExistingFile).not.toHaveBeenCalled();
  });

  it('resolves crate paths from the crate src directory and falls back through shorter module prefixes', () => {
    vi.mocked(findExistingFile).mockImplementation((candidates) => (
      candidates.includes('/workspace/crate/src/services.rs')
        ? '/workspace/crate/src/services.rs'
        : null
    ));

    expect(
      resolveRustUsePath('/workspace/crate/src/lib.rs', '/workspace', 'crate::services::api::client'),
    ).toBe('/workspace/crate/src/services.rs');

    expect(findExistingFile).toHaveBeenNthCalledWith(1, [
      '/workspace/crate/src/services/api/client.rs',
      '/workspace/crate/src/services/api/client/mod.rs',
    ]);
    expect(findExistingFile).toHaveBeenNthCalledWith(2, [
      '/workspace/crate/src/services/api.rs',
      '/workspace/crate/src/services/api/mod.rs',
    ]);
    expect(findExistingFile).toHaveBeenNthCalledWith(3, [
      '/workspace/crate/src/services.rs',
      '/workspace/crate/src/services/mod.rs',
    ]);
  });

  it('resolves super paths from the parent directory of the current module', () => {
    vi.mocked(findExistingFile).mockReturnValue('/workspace/crate/src/features/shared.rs');

    expect(
      resolveRustUsePath('/workspace/crate/src/features/detail/item.rs', '/workspace', 'super::shared'),
    ).toBe('/workspace/crate/src/features/shared.rs');
    expect(findExistingFile).toHaveBeenCalledWith([
      '/workspace/crate/src/features/shared.rs',
      '/workspace/crate/src/features/shared/mod.rs',
    ]);
  });

  it('resolves self paths from the current module directory', () => {
    vi.mocked(findExistingFile).mockReturnValue('/workspace/crate/src/features/helpers/mod.rs');

    expect(
      resolveRustUsePath('/workspace/crate/src/features/item.rs', '/workspace', 'self::helpers'),
    ).toBe('/workspace/crate/src/features/helpers/mod.rs');
    expect(findExistingFile).toHaveBeenCalledWith([
      '/workspace/crate/src/features/helpers.rs',
      '/workspace/crate/src/features/helpers/mod.rs',
    ]);
  });

  it('returns null when no candidate file exists for the use path', () => {
    vi.mocked(findExistingFile).mockReturnValue(null);

    expect(
      resolveRustUsePath('/workspace/crate/src/features/item.rs', '/workspace', 'models::user'),
    ).toBeNull();
    expect(findExistingFile).toHaveBeenNthCalledWith(1, [
      '/workspace/crate/src/features/models/user.rs',
      '/workspace/crate/src/features/models/user/mod.rs',
    ]);
    expect(findExistingFile).toHaveBeenNthCalledWith(2, [
      '/workspace/crate/src/features/models.rs',
      '/workspace/crate/src/features/models/mod.rs',
    ]);
  });
});
