/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['neuroline', 'neuroline-ui'],
  experimental: {
    optimizePackageImports: ['@mui/material', '@mui/icons-material'],
  },
};

module.exports = nextConfig;

