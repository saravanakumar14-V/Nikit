import { useEffect, RefObject } from 'react';

export function useClickOutside(
  ref: RefObject<HTMLElement | null>,
  handler: (event: MouseEvent | TouchEvent) => void,
  active: boolean = true,
  ignoreRefs: RefObject<HTMLElement | null>[] = []
): void {
  useEffect(() => {
    if (!active) return;

    const listener = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null;
      if (!target) return;

      if (ref.current && ref.current.contains(target)) {
        return;
      }

      for (const ignoreRef of ignoreRefs) {
        if (ignoreRef.current && ignoreRef.current.contains(target)) {
          return;
        }
      }

      handler(event);
    };

    document.addEventListener('mousedown', listener);
    document.addEventListener('touchstart', listener);

    return () => {
      document.removeEventListener('mousedown', listener);
      document.removeEventListener('touchstart', listener);
    };
  }, [ref, handler, active, ignoreRefs]);
}
