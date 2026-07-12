import { useCallback, useEffect, useRef } from 'react';
import { animate, useMotionValue } from 'framer-motion';

/**
 * Drag-to-pan backed by Framer Motion values instead of React state.
 *
 * Pointer moves write straight to the motion values (x.set()), which
 * update the canvas transform outside the React render cycle — a drag
 * frame costs zero re-renders and zero tile re-diffs. Momentum on
 * release is Framer's inertia animation driving the same values.
 */

// Displacement (px) below which a pointer-down/up pair counts as a
// click on an artwork rather than a drag.
const CLICK_THRESHOLD = 10;

// Release velocity (px/s) below which we skip the glide entirely.
// Equivalent to the old rAF loop's 1px-per-frame gate.
const MIN_FLING_VELOCITY = 60;

// Tuned to reproduce the old hand-rolled momentum (v *= 0.95 per frame,
// which is a 325ms decay constant travelling ~1/3 of the release
// velocity). Framer's default power of 0.8 glides ~2.4x further —
// too floaty for a room you're meant to wander slowly.
const INERTIA = { type: 'inertia', power: 0.35, timeConstant: 325 } as const;

export const useSmoothDrag = () => {
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const startPosRef = useRef({ x: 0, y: 0 });
  const startOffsetRef = useRef({ x: 0, y: 0 });
  const dragDistanceRef = useRef<number>(0);
  // The element whose cursor we flip to 'grabbing' for the duration of
  // a drag. Held so pointer-up (a window listener) can restore it.
  const surfaceRef = useRef<HTMLElement | null>(null);

  const handlePointerMove = useCallback(
    (e: PointerEvent) => {
      e.preventDefault();

      const deltaX = e.clientX - startPosRef.current.x;
      const deltaY = e.clientY - startPosRef.current.y;

      // Motion values track their own velocity, which feeds the
      // inertia glide on release.
      x.set(startOffsetRef.current.x + deltaX);
      y.set(startOffsetRef.current.y + deltaY);

      // Displacement from the press point, for click detection.
      dragDistanceRef.current = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    },
    [x, y]
  );

  const handlePointerUp = useCallback(() => {
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
    if (surfaceRef.current) {
      surfaceRef.current.style.cursor = 'grab';
      surfaceRef.current = null;
    }

    window.removeEventListener('pointermove', handlePointerMove);
    window.removeEventListener('pointerup', handlePointerUp);
    window.removeEventListener('pointercancel', handlePointerUp);

    // getVelocity reads ~0 when the pointer paused before release, so
    // drag-hold-release correctly stays put instead of glancing off.
    const velocityX = x.getVelocity();
    const velocityY = y.getVelocity();
    if (
      Math.abs(velocityX) > MIN_FLING_VELOCITY ||
      Math.abs(velocityY) > MIN_FLING_VELOCITY
    ) {
      // The inertia generator ignores the `to` keyframe (it derives its
      // own target as origin + power * velocity), but `to` must still
      // differ from the current value: framer's canAnimate() instantly
      // completes any animation whose keyframes are all equal, and its
      // velocity escape hatch only covers springs, not inertia.
      animate(x, x.get() + velocityX, { ...INERTIA, velocity: velocityX });
      animate(y, y.get() + velocityY, { ...INERTIA, velocity: velocityY });
    }
  }, [x, y, handlePointerMove]);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      // Grabbing mid-glide freezes any in-flight inertia.
      x.stop();
      y.stop();

      startPosRef.current = { x: e.clientX, y: e.clientY };
      startOffsetRef.current = { x: x.get(), y: y.get() };
      dragDistanceRef.current = 0;

      // Cursor flips imperatively — the drag surface keeps cursor:grab
      // as its resting inline style — so dragging never touches React.
      surfaceRef.current = e.currentTarget as HTMLElement;
      surfaceRef.current.style.cursor = 'grabbing';
      document.body.style.cursor = 'grabbing';
      document.body.style.userSelect = 'none';

      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerup', handlePointerUp);
      window.addEventListener('pointercancel', handlePointerUp);
    },
    [x, y, handlePointerMove, handlePointerUp]
  );

  // If the canvas unmounts mid-drag, drop the window listeners and
  // body overrides rather than leaking them.
  useEffect(() => {
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [handlePointerMove, handlePointerUp]);

  const isClick = useCallback(() => {
    return dragDistanceRef.current < CLICK_THRESHOLD;
  }, []);

  return {
    x,
    y,
    handlePointerDown,
    isClick,
  };
};
