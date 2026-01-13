/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['neuroline', 'neuroline-ui', 'neuroline-nextjs', 'demo-pipelines'],
  experimental: {
    optimizePackageImports: ['@mui/material'],
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

