import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@cdm/ui', '@cdm/types'],
};

export default nextConfig;
