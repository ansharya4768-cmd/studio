import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
    ],
  },
  webpack: (config, { isServer }) => {
    // Exclude wasm from server-side bundling
    config.externals = {
      ...config.externals,
      '@emurgo/cardano-serialization-lib-asmjs': 'commonjs @emurgo/cardano-serialization-lib-asmjs',
    };
    return config;
  },
};

export default nextConfig;
