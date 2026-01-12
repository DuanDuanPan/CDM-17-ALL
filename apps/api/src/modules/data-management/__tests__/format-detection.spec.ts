import { getDataAssetFormatFromFilename } from '../utils/format-detection';

describe('getDataAssetFormatFromFilename', () => {
  it('returns STEP for .step files', () => {
    expect(getDataAssetFormatFromFilename('model.step')).toBe('STEP');
  });

  it('returns STEP for .stp files', () => {
    expect(getDataAssetFormatFromFilename('model.stp')).toBe('STEP');
  });

  it('returns IGES for .iges files', () => {
    expect(getDataAssetFormatFromFilename('model.iges')).toBe('IGES');
  });

  it('returns IGES for .igs files', () => {
    expect(getDataAssetFormatFromFilename('model.igs')).toBe('IGES');
  });

  it('returns GLTF for .gltf files', () => {
    expect(getDataAssetFormatFromFilename('model.gltf')).toBe('GLTF');
  });

  it('returns GLTF for .glb files', () => {
    expect(getDataAssetFormatFromFilename('model.glb')).toBe('GLTF');
  });

  it('returns STL for .stl files', () => {
    expect(getDataAssetFormatFromFilename('model.stl')).toBe('STL');
  });

  it('returns OBJ for .obj files', () => {
    expect(getDataAssetFormatFromFilename('model.obj')).toBe('OBJ');
  });

  it('returns VTK for .vtk files', () => {
    expect(getDataAssetFormatFromFilename('contour.vtk')).toBe('VTK');
  });

  it('returns VTK for .vtp files', () => {
    expect(getDataAssetFormatFromFilename('mesh.vtp')).toBe('VTK');
  });

  it('returns VTK for .vtu files', () => {
    expect(getDataAssetFormatFromFilename('volume.vtu')).toBe('VTK');
  });

  it('returns VTK for .vti files', () => {
    expect(getDataAssetFormatFromFilename('image.vti')).toBe('VTK');
  });

  it('returns PDF for .pdf files', () => {
    expect(getDataAssetFormatFromFilename('doc.pdf')).toBe('PDF');
  });

  it('returns OTHER for unknown extensions', () => {
    expect(getDataAssetFormatFromFilename('whatever.unknown')).toBe('OTHER');
  });

  it('handles case insensitivity', () => {
    expect(getDataAssetFormatFromFilename('MODEL.STEP')).toBe('STEP');
  });

  it('handles filenames without extensions', () => {
    expect(getDataAssetFormatFromFilename('noext')).toBe('OTHER');
  });
});

