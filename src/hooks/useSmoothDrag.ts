import { useRef, useCallback, useState } from 'react';

interface Position {
  x: number;
  y: number;
}

interface DragState {
  isDragging: boolean;
  position: Position;
  velocity: Position;
}

export const useSmoothDrag = () => {
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    position: { x: 0, y: 0 },
    velocity: { x: 0, y: 0 },
  });

  const startPosRef = useRef<Position>({ x: 0, y: 0 });
  const startOffsetRef = useRef<Position>({ x: 0, y: 0 });
  const lastMoveTimeRef = useRef<number>(0);
  const lastPosRef = useRef<Position>({ x: 0, y: 0 });
  const dragDistanceRef = useRef<number>(0);
  const animationFrameRef = useRef<number | null>(null);

  // Momentum decay
  const applyMomentum = useCallback(() => {
    setDragState((prev) => {
      if (prev.isDragging) return prev;

      const friction = 0.95;
      const minVelocity = 0.1;

      const newVelocityX = prev.velocity.x * friction;
      const newVelocityY = prev.velocity.y * friction;

      // Stop if velocity is too small
      if (Math.abs(newVelocityX) < minVelocity && Math.abs(newVelocityY) < minVelocity) {
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
          animationFrameRef.current = null;
        }
        return {
          ...prev,
          velocity: { x: 0, y: 0 },
        };
      }

      // Continue momentum
      animationFrameRef.current = requestAnimationFrame(applyMomentum);

      return {
        ...prev,
        position: {
          x: prev.position.x + newVelocityX,
          y: prev.position.y + newVelocityY,
        },
        velocity: {
          x: newVelocityX,
          y: newVelocityY,
        },
      };
    });
  }, []);

  const handlePointerMove = useCallback((e: PointerEvent) => {
    e.preventDefault();

    const now = Date.now();
    const deltaTime = now - lastMoveTimeRef.current || 16;

    const deltaX = e.clientX - startPosRef.current.x;
    const deltaY = e.clientY - startPosRef.current.y;

    const newX = startOffsetRef.current.x + deltaX;
    const newY = startOffsetRef.current.y + deltaY;

    // Calculate velocity for momentum
    const velocityX = (newX - lastPosRef.current.x) / deltaTime * 16;
    const velocityY = (newY - lastPosRef.current.y) / deltaTime * 16;

    lastPosRef.current = { x: newX, y: newY };
    lastMoveTimeRef.current = now;

    // Track total drag distance for click detection
    dragDistanceRef.current = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

    setDragState({
      isDragging: true,
      position: { x: newX, y: newY },
      velocity: { x: velocityX, y: velocityY },
    });
  }, []);

  const handlePointerUp = useCallback(() => {
    document.body.style.cursor = '';
    document.body.style.userSelect = '';

    window.removeEventListener('pointermove', handlePointerMove);
    window.removeEventListener('pointerup', handlePointerUp);
    window.removeEventListener('pointercancel', handlePointerUp);

    setDragState((prev) => {
      // Start momentum animation if there's velocity
      if (Math.abs(prev.velocity.x) > 1 || Math.abs(prev.velocity.y) > 1) {
        animationFrameRef.current = requestAnimationFrame(applyMomentum);
      }

      return {
        ...prev,
        isDragging: false,
      };
    });
  }, [handlePointerMove, applyMomentum]);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      // Cancel any ongoing momentum
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }

      startPosRef.current = { x: e.clientX, y: e.clientY };
      startOffsetRef.current = { ...dragState.position };
      lastPosRef.current = { ...dragState.position };
      lastMoveTimeRef.current = Date.now();
      dragDistanceRef.current = 0;

      document.body.style.cursor = 'grabbing';
      document.body.style.userSelect = 'none';

      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerup', handlePointerUp);
      window.addEventListener('pointercancel', handlePointerUp);

      setDragState((prev) => ({
        ...prev,
        isDragging: true,
        velocity: { x: 0, y: 0 },
      }));
    },
    [dragState.position, handlePointerMove, handlePointerUp]
  );

  const isClick = useCallback(() => {
    return dragDistanceRef.current < 10;
  }, []);

  return {
    position: dragState.position,
    isDragging: dragState.isDragging,
    velocity: dragState.velocity,
    handlePointerDown,
    isClick,
  };
};
