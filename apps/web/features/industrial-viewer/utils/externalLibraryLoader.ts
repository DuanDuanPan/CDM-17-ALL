/**
 * External Library Loader for Online3DViewer
 *
 * Provides offline support by loading external decoder libraries from local paths
 * instead of CDN URLs. This is required for air-gapped/intranet deployments.
 *
 * Supported libraries:
 * - draco3d: For Draco-compressed glTF files
 * - rhino3dm: For 3DM (Rhino) files
 * - web-ifc: For IFC (BIM) files
 */

export type ExternalLibraryName = 'draco3d' | 'rhino3dm' | 'web-ifc';

// Library configuration with local paths
const LIBRARY_CONFIG: Record<
  ExternalLibraryName,
  { localPath: string; globalCheck: () => boolean }
> = {
  draco3d: {
    localPath: '/libs/draco/draco_decoder_nodejs.min.js',
    globalCheck: () => typeof (window as unknown as { DracoDecoderModule?: unknown }).DracoDecoderModule !== 'undefined',
  },
  rhino3dm: {
    localPath: '/libs/rhino3dm/rhino3dm.min.js',
    globalCheck: () => typeof (window as unknown as { rhino3dm?: unknown }).rhino3dm !== 'undefined',
  },
  'web-ifc': {
    localPath: '/libs/web-ifc/web-ifc-api-iife.js',
    globalCheck: () => typeof (window as unknown as { WebIFC?: unknown }).WebIFC !== 'undefined',
  },
};

// Track loaded libraries
const loadedLibraries = new Set<ExternalLibraryName>();
const loadingPromises = new Map<ExternalLibraryName, Promise<void>>();

/**
 * Load an external library from local path
 */
export function loadExternalLibrary(
  libraryName: ExternalLibraryName
): Promise<void> {
  // Already loaded
  if (loadedLibraries.has(libraryName)) {
    return Promise.resolve();
  }

  // Check if global already exists (library loaded elsewhere)
  const config = LIBRARY_CONFIG[libraryName];
  if (config.globalCheck()) {
    loadedLibraries.add(libraryName);
    return Promise.resolve();
  }

  // Return existing loading promise if in progress
  const existingPromise = loadingPromises.get(libraryName);
  if (existingPromise) {
    return existingPromise;
  }

  // Create new loading promise
  const promise = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = config.localPath;
    script.async = true;

    script.onload = () => {
      loadedLibraries.add(libraryName);
      loadingPromises.delete(libraryName);
      console.log(`[ExternalLibraryLoader] Loaded ${libraryName} from ${config.localPath}`);
      resolve();
    };

    script.onerror = () => {
      loadingPromises.delete(libraryName);
      console.error(`[ExternalLibraryLoader] Failed to load ${libraryName} from ${config.localPath}`);
      reject(new Error(`Failed to load external library: ${libraryName}`));
    };

    document.head.appendChild(script);
  });

  loadingPromises.set(libraryName, promise);
  return promise;
}

/**
 * Pre-load all external libraries for offline support
 * Call this early in the app lifecycle for best performance
 */
export async function preloadAllExternalLibraries(): Promise<void> {
  const libraries: ExternalLibraryName[] = ['draco3d', 'rhino3dm', 'web-ifc'];

  await Promise.allSettled(libraries.map(loadExternalLibrary));

  console.log('[ExternalLibraryLoader] Pre-loading complete');
}

/**
 * Check if a library is loaded
 */
export function isLibraryLoaded(libraryName: ExternalLibraryName): boolean {
  return loadedLibraries.has(libraryName) || LIBRARY_CONFIG[libraryName].globalCheck();
}

/**
 * Get the file extension to library mapping
 * Used to determine which library to load based on file type
 */
export function getRequiredLibraryForFormat(
  format: string
): ExternalLibraryName | null {
  const formatLower = format.toLowerCase();

  switch (formatLower) {
    case '3dm':
      return 'rhino3dm';
    case 'ifc':
      return 'web-ifc';
    case 'gltf':
    case 'glb':
      // Draco is optional for glTF, only needed if Draco-compressed
      // We pre-load it to be safe for offline environments
      return 'draco3d';
    default:
      return null;
  }
}
