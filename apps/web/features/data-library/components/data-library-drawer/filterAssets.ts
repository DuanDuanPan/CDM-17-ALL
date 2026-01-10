import type { DataAssetFormat } from '@cdm/types';

type FilterableAsset = {
  name: string;
  format: DataAssetFormat;
  createdAt: string;
};

interface FilterOptions {
  search: string;
  format: DataAssetFormat | '';
  createdAfter: string;
  createdBefore: string;
}

function parseDateBoundary(value: string, boundary: 'start' | 'end'): Date {
  if (/^\\d{4}-\\d{2}-\\d{2}$/.test(value)) {
    const time = boundary === 'start' ? '00:00:00.000' : '23:59:59.999';
    return new Date(`${value}T${time}Z`);
  }
  return new Date(value);
}

export function filterAssets<T extends FilterableAsset>(
  assets: T[],
  { search, format, createdAfter, createdBefore }: FilterOptions
): T[] {
  const after = createdAfter ? parseDateBoundary(createdAfter, 'start') : null;
  const before = createdBefore ? parseDateBoundary(createdBefore, 'end') : null;

  return assets.filter((asset) => {
    if (search) {
      const q = search.toLowerCase();
      if (!asset.name.toLowerCase().includes(q)) return false;
    }
    if (format && asset.format !== format) return false;
    if (after) {
      const created = new Date(asset.createdAt);
      if (created < after) return false;
    }
    if (before) {
      const created = new Date(asset.createdAt);
      if (created > before) return false;
    }
    return true;
  });
}

