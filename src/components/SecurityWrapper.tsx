'use client';

import { useEffect, ReactNode } from 'react';

export default function SecurityWrapper({ children }: { children: ReactNode }) {
  useEffect(() => {
    // Prevent right click
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    // Prevent dragging images/elements
    const handleDragStart = (e: DragEvent) => {
      e.preventDefault();
    };

    // Prevent common inspection and saving keyboard shortcuts
    const handleKeyDown = (e: KeyboardEvent) => {
      // Block F12 (DevTools)
      if (e.key === 'F12') {
        e.preventDefault();
      }

      // Block Ctrl/Cmd + shortcuts
      if (e.ctrlKey || e.metaKey) {
        // Block Ctrl+Shift+I or Cmd+Option+I (DevTools)
        if (e.shiftKey && (e.key === 'I' || e.key === 'i')) {
          e.preventDefault();
        }
        // Block Ctrl+Shift+J or Cmd+Option+J (Console)
        if (e.shiftKey && (e.key === 'J' || e.key === 'j')) {
          e.preventDefault();
        }
        // Block Ctrl+Shift+C or Cmd+Option+C (Inspect Element)
        if (e.shiftKey && (e.key === 'C' || e.key === 'c')) {
          e.preventDefault();
        }
        // Block Ctrl+U or Cmd+U (View Source)
        if (e.key === 'U' || e.key === 'u') {
          e.preventDefault();
        }
        // Block Ctrl+S or Cmd+S (Save Page)
        if (e.key === 'S' || e.key === 's') {
          e.preventDefault();
        }
        // Block Ctrl+P or Cmd+P (Print Page)
        if (e.key === 'P' || e.key === 'p') {
          e.preventDefault();
        }
      }
    };

    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('dragstart', handleDragStart);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('dragstart', handleDragStart);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return (
    <div
      className="w-full h-full min-h-screen"
      style={{
        WebkitUserSelect: 'none',
        userSelect: 'none',
        WebkitTouchCallout: 'none'
      }}
    >
      {children}
    </div>
  );
}
