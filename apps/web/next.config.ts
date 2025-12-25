import type { NextConfig } from 'next';

const apiBaseUrl = (process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001').replace(/\/$/, '');

const nextConfig: NextConfig = {
  transpilePackages: ['@cdm/ui', '@cdm/types', '@cdm/plugins', '@cdm/plugin-layout', '@cdm/plugin-mindmap-core'],
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${apiBaseUrl}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
