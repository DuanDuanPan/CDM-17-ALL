export type ContourLoadResult = {
  data: unknown;
  scalarRange?: [number, number];
  scalarName?: string | null;
  unit?: string | null;
};

function getExt(dataUrl: string) {
  const lower = dataUrl.toLowerCase();
  if (lower.endsWith('.scalar.json')) return 'scalar.json';
  if (lower.endsWith('.contour.json')) return 'contour.json';
  return lower.split('.').pop() ?? '';
}

function computeMinMax(values: number[]): [number, number] {
  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;
  for (const v of values) {
    if (!Number.isFinite(v)) continue;
    if (v < min) min = v;
    if (v > max) max = v;
  }
  if (!Number.isFinite(min) || !Number.isFinite(max)) return [0, 1];
  if (min === max) return [min - 1, max + 1];
  return [min, max];
}

export async function loadContourData(dataUrl: string): Promise<ContourLoadResult> {
  const ext = getExt(dataUrl);

  if (ext === 'vtp') {
    const { default: vtkXMLPolyDataReader } = await import('@kitware/vtk.js/IO/XML/XMLPolyDataReader');
    const reader = vtkXMLPolyDataReader.newInstance();
    await reader.setUrl(dataUrl);
    return { data: reader.getOutputData() };
  }

  if (ext === 'vti') {
    const { default: vtkXMLImageDataReader } = await import('@kitware/vtk.js/IO/XML/XMLImageDataReader');
    const reader = vtkXMLImageDataReader.newInstance();
    await reader.setUrl(dataUrl);
    return { data: reader.getOutputData() };
  }

  if (ext === 'vtk') {
    const { default: vtkPolyDataReader } = await import('@kitware/vtk.js/IO/Legacy/PolyDataReader');
    const reader = vtkPolyDataReader.newInstance();
    await reader.setUrl(dataUrl);
    return { data: reader.getOutputData() };
  }

  if (ext === 'vtu') {
    throw new Error('VTU is not supported by the current viewer build (convert to .vtp/.vti)');
  }

  if (ext === 'json' || ext === 'scalar.json' || ext === 'contour.json') {
    const resp = await fetch(dataUrl);
    if (!resp.ok) throw new Error(`Failed to fetch scalar json: ${resp.status} ${resp.statusText}`);
    const json = (await resp.json()) as any;
    if (json?.format !== 'scalar-field-json') throw new Error('Invalid JSON format: expected scalar-field-json');

    const points: unknown[] = json.geometry?.points;
    const cells: unknown[] = json.geometry?.cells;
    const values: unknown[] = json.scalars?.values;
    if (!Array.isArray(points) || !Array.isArray(cells) || !Array.isArray(values)) {
      throw new Error('Invalid scalar-field-json schema');
    }

    const scalarName = typeof json.scalars?.name === 'string' ? json.scalars.name : null;
    const unit = typeof json.scalars?.unit === 'string' ? json.scalars.unit : null;

    const [{ default: vtkPolyData }, { default: vtkDataArray }] = await Promise.all([
      import('@kitware/vtk.js/Common/DataModel/PolyData'),
      import('@kitware/vtk.js/Common/Core/DataArray'),
    ]);

    const flatPoints = points.flat().map(Number);
    if (flatPoints.length % 3 !== 0) throw new Error('Invalid scalar-field-json: points must be [x,y,z][]');

    const flatCells = cells.flat().map(Number);
    const scalarValues = values.map(Number);

    const polyData = vtkPolyData.newInstance();
    polyData.getPoints().setData(new Float32Array(flatPoints), 3);
    polyData.getPolys().setData(new Uint32Array(flatCells));
    const scalars = vtkDataArray.newInstance({ name: scalarName || 'Scalars', values: Float32Array.from(scalarValues) });
    polyData.getPointData().setScalars(scalars);

    return { data: polyData, scalarRange: computeMinMax(scalarValues), scalarName, unit };
  }

  throw new Error(`Unsupported contour format: ${ext}`);
}
