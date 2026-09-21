import { useState, useLayoutEffect, RefObject } from 'react';
import { Placement } from '@nikit/types';

interface PositionResult {
  top: number;
  left: number;
  computedPlacement: Placement;
}

export function useAnchoredPosition(
  anchorRef: RefObject<HTMLElement | null>,
  floatingRef: RefObject<HTMLElement | null>,
  placement: Placement = 'bottom-start',
  offset: number = 6,
  isOpen: boolean = false
): PositionResult {
  const [position, setPosition] = useState<PositionResult>({
    top: 0,
    left: 0,
    computedPlacement: placement,
  });

  useLayoutEffect(() => {
    if (!isOpen || !anchorRef.current || !floatingRef.current) return;

    const updatePosition = () => {
      if (!anchorRef.current || !floatingRef.current) return;

      const anchorRect = anchorRef.current.getBoundingClientRect();
      const floatingRect = floatingRef.current.getBoundingClientRect();

      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      let top = 0;
      let left = 0;
      let actualPlacement = placement;

      // Vertical calculation
      if (placement.startsWith('bottom')) {
        top = anchorRect.bottom + offset;
        // Flip to top if overflowing bottom
        if (top + floatingRect.height > viewportHeight - 8 && anchorRect.top - floatingRect.height - offset > 8) {
          top = anchorRect.top - floatingRect.height - offset;
          actualPlacement = placement.replace('bottom', 'top') as Placement;
        }
      } else if (placement.startsWith('top')) {
        top = anchorRect.top - floatingRect.height - offset;
        // Flip to bottom if overflowing top
        if (top < 8 && anchorRect.bottom + floatingRect.height + offset < viewportHeight - 8) {
          top = anchorRect.bottom + offset;
          actualPlacement = placement.replace('top', 'bottom') as Placement;
        }
      } else if (placement === 'left') {
        left = anchorRect.left - floatingRect.width - offset;
        top = anchorRect.top + (anchorRect.height - floatingRect.height) / 2;
      } else if (placement === 'right') {
        left = anchorRect.right + offset;
        top = anchorRect.top + (anchorRect.height - floatingRect.height) / 2;
      }

      // Horizontal calculation for top/bottom alignments
      if (actualPlacement.startsWith('top') || actualPlacement.startsWith('bottom')) {
        if (actualPlacement.endsWith('-start')) {
          left = anchorRect.left;
        } else if (actualPlacement.endsWith('-end')) {
          left = anchorRect.right - floatingRect.width;
        } else {
          // Centered
          left = anchorRect.left + (anchorRect.width - floatingRect.width) / 2;
        }

        // Clamp to viewport
        if (left < 8) left = 8;
        if (left + floatingRect.width > viewportWidth - 8) {
          left = viewportWidth - floatingRect.width - 8;
        }
      }

      // Clamp vertical
      if (top < 8) top = 8;
      if (top + floatingRect.height > viewportHeight - 8) {
        top = Math.max(8, viewportHeight - floatingRect.height - 8);
      }

      setPosition({
        top: Math.round(top),
        left: Math.round(left),
        computedPlacement: actualPlacement,
      });
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);

    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [anchorRef, floatingRef, placement, offset, isOpen]);

  return position;
}
