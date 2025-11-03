import { useRef, useCallback } from 'react';
import { useMotionValue } from 'framer-motion';
import { CanvasOffset } from '../types';

export const useInfiniteCanvas = () => {
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const offsetRef = useRef<CanvasOffset>({ x: 0, y: 0 });
  const isDraggingRef = useRef(false);
  const dragStartPos = useRef({ x: 0, y: 0 });
  const dragStartOffset = useRef({ x: 0, y: 0 });
  const totalDragDistance = useRef(0);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDraggingRef.current) return;

    const deltaX = e.clientX - dragStartPos.current.x;
    const deltaY = e.clientY - dragStartPos.current.y;

    const newX = dragStartOffset.current.x + deltaX;
    const newY = dragStartOffset.current.y + deltaY;

    x.set(newX);
    y.set(newY);

    totalDragDistance.current = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
  }, [x, y]);

  const handleMouseUp = useCallback(() => {
    if (!isDraggingRef.current) return;

    offsetRef.current = {
      x: x.get(),
      y: y.get(),
    };

    isDraggingRef.current = false;
    document.body.style.cursor = 'grab';

    window.removeEventListener('mousemove', handleMouseMove);
    window.removeEventListener('mouseup', handleMouseUp);
  }, [x, y, handleMouseMove]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    isDraggingRef.current = true;
    dragStartPos.current = { x: e.clientX, y: e.clientY };
    dragStartOffset.current = { ...offsetRef.current };
    totalDragDistance.current = 0;
    document.body.style.cursor = 'grabbing';

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  }, [handleMouseMove, handleMouseUp]);

  const isClick = useCallback(() => {
    return totalDragDistance.current < 10;
  }, []);

  return {
    x,
    y,
    offset: offsetRef.current,
    isDragging: isDraggingRef.current,
    isClick,
    handleMouseDown,
  };
};
