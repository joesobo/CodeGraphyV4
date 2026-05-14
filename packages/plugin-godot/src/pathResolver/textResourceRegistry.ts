export class GodotTextResourceRegistry {
  private resourceUidMap: Map<string, string> = new Map();
  private fileResourceUids: Map<string, string> = new Map();
  private registeredFiles: Set<string> = new Set();

  registerFile(filePath: string): void {
    this.registeredFiles.add(filePath);
  }

  replaceFileResourceUid(filePath: string, uid: string | null): { changed: boolean } {
    const previous = this.fileResourceUids.get(filePath) ?? null;
    const changed = previous !== uid;

    if (previous && this.resourceUidMap.get(previous) === filePath) {
      this.resourceUidMap.delete(previous);
    }

    this.fileResourceUids.delete(filePath);
    if (uid) {
      this.fileResourceUids.set(filePath, uid);
      this.resourceUidMap.set(uid, filePath);
    }
    return { changed };
  }

  resolveResourceUid(uid: string | undefined): string | null {
    return uid ? this.resourceUidMap.get(uid) ?? null : null;
  }

  clear(): void {
    this.resourceUidMap.clear();
    this.fileResourceUids.clear();
    this.registeredFiles.clear();
  }

  getRegisteredFiles(): string[] {
    return [...this.registeredFiles];
  }
}
