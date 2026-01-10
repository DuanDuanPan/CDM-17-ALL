import { useCallback, useEffect, useState } from 'react';
import type { MouseEvent as ReactMouseEvent } from 'react';

interface DrawerResizeOptions {
  initialWidth?: number;
  minWidth?: number;
  maxWidth?: number;
}

export function useDrawerResize({
  initialWidth = 65,
  minWidth = 30,
  maxWidth = 90,
}: DrawerResizeOptions = {}) {
  const [drawerWidth, setDrawerWidth] = useState(initialWidth);
  const [isResizing, setIsResizing] = useState(false);

  const handleResizeStart = useCallback((e: ReactMouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;

      const viewportWidth = window.innerWidth;
      const newWidth = ((viewportWidth - e.clientX) / viewportWidth) * 100;

      setDrawerWidth(Math.min(maxWidth, Math.max(minWidth, newWidth)));
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, maxWidth, minWidth]);

  return { drawerWidth, isResizing, handleResizeStart };
}

