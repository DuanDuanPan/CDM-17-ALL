'use client';

/**
 * Story 2.9: Global App Library Context
 * Provides a global modal dialog for selecting apps from the satellite library
 * This allows any component to open the library dialog without being nested in AppForm
 */

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import type { AppLibraryEntry } from '@cdm/types';
import { AppLibraryDialog } from '../components/App/AppLibraryDialog';

export interface AppLibraryContextValue {
    /**
     * Open the app library dialog
     * @param onSelect - Callback when an app is selected
     */
    openAppLibrary: (onSelect: (entry: AppLibraryEntry) => void) => void;
    /**
     * Close the app library dialog
     */
    closeAppLibrary: () => void;
    /**
     * Whether the dialog is currently open
     */
    isOpen: boolean;
}

const AppLibraryContext = createContext<AppLibraryContextValue | null>(null);

export interface AppLibraryProviderProps {
    children: ReactNode;
}

export function AppLibraryProvider({ children }: AppLibraryProviderProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [onSelectCallback, setOnSelectCallback] = useState<((entry: AppLibraryEntry) => void) | null>(null);

    const openAppLibrary = useCallback((onSelect: (entry: AppLibraryEntry) => void) => {
        setOnSelectCallback(() => onSelect);
        setIsOpen(true);
    }, []);

    const closeAppLibrary = useCallback(() => {
        setIsOpen(false);
        setOnSelectCallback(null);
    }, []);

    const handleSelect = useCallback((entry: AppLibraryEntry) => {
        if (onSelectCallback) {
            onSelectCallback(entry);
        }
        closeAppLibrary();
    }, [onSelectCallback, closeAppLibrary]);

    const handleOpenChange = useCallback((open: boolean) => {
        if (!open) {
            closeAppLibrary();
        }
    }, [closeAppLibrary]);

    return (
        <AppLibraryContext.Provider value={{ openAppLibrary, closeAppLibrary, isOpen }}>
            {children}
            {/* Global App Library Dialog - rendered at root level */}
            <AppLibraryDialog
                open={isOpen}
                onOpenChange={handleOpenChange}
                onSelect={handleSelect}
            />
        </AppLibraryContext.Provider>
    );
}

/**
 * Hook to access the app library context
 * @throws Error if used outside of AppLibraryProvider
 */
export function useAppLibrary(): AppLibraryContextValue {
    const context = useContext(AppLibraryContext);
    if (!context) {
        throw new Error('useAppLibrary must be used within an AppLibraryProvider');
    }
    return context;
}

/**
 * Optional hook that returns null if used outside provider
 */
export function useAppLibraryOptional(): AppLibraryContextValue | null {
    return useContext(AppLibraryContext);
}
