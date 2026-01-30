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
const docsIndexPath = path.join(__dirname, 'public', 'docs', 'index.html');

const hasEmbeddedStorybook = fs.existsSync(storybookIndexPath);
const hasEmbeddedDocs = fs.existsSync(docsIndexPath);

const nextConfig = {
  transpilePackages: ['neuroline', 'neuroline-ui', 'neuroline-nextjs', 'demo-pipelines'],
  experimental: {
    optimizePackageImports: ['@mui/material'],
  },
  async rewrites() {
    const beforeFiles = [];

    if (hasEmbeddedStorybook) {
      const sbBase = '/packages/neuroline-ui/storybook';

      beforeFiles.push(
        // Точка входа без trailing slash
        { source: sbBase, destination: `${sbBase}/index.html` },
        { source: `${sbBase}/`, destination: `${sbBase}/index.html` },

        // Storybook 10: storybookiframe.html → iframe.html
        { source: '/packages/neuroline-ui/storybookiframe.html', destination: `${sbBase}/iframe.html` },

        // Storybook 10: файлы, запрашиваемые из корня (проблема base path в iframe)
        { source: '/vite-inject-mocker-entry.js', destination: `${sbBase}/vite-inject-mocker-entry.js` },
        { source: '/assets/:path*', destination: `${sbBase}/assets/:path*` },
      );
    }

    if (hasEmbeddedDocs) {
      beforeFiles.push(
        {
          source: '/docs',
          destination: '/docs/index.html',
        },
        {
          source: '/docs/',
          destination: '/docs/index.html',
        },
        {
          source: '/docs/:path*/',
          destination: '/docs/:path*/index.html',
        },
      );
    }

    if (!beforeFiles.length) return [];

    return { beforeFiles };
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
