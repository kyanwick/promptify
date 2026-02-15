import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  
  // Ignore TypeScript build errors for Supabase edge functions
  typescript: {
    ignoreBuildErrors: true,
  },
  
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'picsum.photos',
      },
      {
        protocol: 'https',
        hostname: '**.supabase.co', // For Supabase storage images
      },
    ],
  },
  
  webpack(config) {
    config.module.rules.push({
      test: /\.svg$/,
      use: ["@svgr/webpack"],
    });
    return config;
  },
    
  turbopack: {
    rules: {
      '*.svg': {
        loaders: ['@svgr/webpack'],
        as: '*.js',
      },
    },
  },
  
  // Exclude supabase from output file tracing
  experimental: {
    outputFileTracingExcludes: {
      '*': ['./supabase/**/*'],
    },
  },
};

export default nextConfig;