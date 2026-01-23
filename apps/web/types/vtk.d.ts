/**
 * VTK.js Type Declarations
 *
 * Story 9.4: Type declarations for missing @kitware/vtk.js modules
 */

declare module '@kitware/vtk.js/IO/Legacy/PolyDataReader' {
  const vtkPolyDataReader: {
    newInstance: () => {
      setUrl: (url: string, option?: { compression?: string; progressCallback?: unknown }) => Promise<unknown>;
      getOutputData: () => unknown;
    };
  };

  export default vtkPolyDataReader;
}

declare module '@kitware/vtk.js/Rendering/Profiles/Geometry' {
  const vtkGeometryProfile: unknown;
  export default vtkGeometryProfile;
}
