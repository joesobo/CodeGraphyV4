import { useRef, type MutableRefObject } from 'react';

export function useLazyRef<T>(factory: () => T): MutableRefObject<T> {
  const ref = useRef<T | null>(null);
  if (ref.current === null) ref.current = factory();
  return ref as MutableRefObject<T>;
}
