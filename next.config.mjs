const isProduction = process.env.NODE_ENV === 'production';
const repoName = 'PostgreSQL';

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  images: {
    unoptimized: true
  },
  trailingSlash: true,
  basePath: isProduction ? `/${repoName}` : '',
  assetPrefix: isProduction ? `/${repoName}/` : ''
};

export default nextConfig;
