'use client';

import { createPortal } from 'react-dom';
import { DataLibraryDrawerPanel, type DataLibraryDrawerPanelProps } from './DataLibraryDrawerPanel';

export function DataLibraryDrawerView(props: DataLibraryDrawerPanelProps) {
  return createPortal(
    <>
      <div
        data-testid="drawer-backdrop"
        className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 transition-opacity"
        onClick={props.onClose}
      />
      <DataLibraryDrawerPanel {...props} />
    </>,
    document.body
  );
}

