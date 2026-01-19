/** @type {import('next').NextConfig} */
const fs = require('node:fs');
const path = require('node:path');

const storybookIndexPath = path.join(
  __dirname,
  'public',
  'packages',
  'neuroline-ui',
  'storybook',
  'index.html',
);

const hasEmbeddedStorybook = fs.existsSync(storybookIndexPath);

const nextConfig = {
  transpilePackages: ['neuroline', 'neuroline-ui', 'neuroline-nextjs', 'demo-pipelines'],
  experimental: {
    optimizePackageImports: ['@mui/material'],
  },
  async rewrites() {
    if (!hasEmbeddedStorybook) return [];

    return {
      beforeFiles: [
        {
          source: '/packages/neuroline-ui/storybook',
          destination: '/packages/neuroline-ui/storybook/index.html',
        },
        {
          source: '/packages/neuroline-ui/storybook/',
          destination: '/packages/neuroline-ui/storybook/index.html',
        },
      ],
    };
  },
  webpack: (config, { isServer }) => {
    // Игнорируем опциональные зависимости mongodb для client-side encryption
    // Они не нужны для базовой работы с MongoDB
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        aws4: false,
        'mongodb-client-encryption': false,
        kerberos: false,
        '@mongodb-js/zstd': false,
        '@aws-sdk/credential-providers': false,
        snappy: false,
      };
    }
    return config;
  },
};

module.exports = nextConfig;
