import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'export',
  // GitHub Pages serves the repo at attilaczudor.github.io/diagram-editor
  basePath: '/diagram-editor',
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
