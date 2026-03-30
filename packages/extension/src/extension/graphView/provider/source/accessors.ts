export function attachMutableAccessors<
  Source extends object,
  Owner extends object,
  Key extends Extract<keyof Source & keyof Owner, string>,
>(target: Source, owner: Owner, keys: readonly Key[]): void {
  for (const key of keys) {
    Object.defineProperty(target, key, {
      configurable: true,
      enumerable: true,
      get: () => owner[key],
      set: value => {
        (owner as Record<Key, Owner[Key]>)[key] = value as Owner[Key];
      },
    });
  }
}

export function attachReadonlyAccessors<
  Source extends object,
  Owner extends object,
  Key extends Extract<keyof Source & keyof Owner, string>,
>(target: Source, owner: Owner, keys: readonly Key[]): void {
  for (const key of keys) {
    Object.defineProperty(target, key, {
      configurable: true,
      enumerable: true,
      get: () => owner[key],
    });
  }
}
