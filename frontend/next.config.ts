import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  distDir: 'build',
  images: {
    unoptimized: true,
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
          // 'credentialless' keeps cross-origin isolation but, unlike 'require-corp',
          // still allows third-party images (the lifeprint.com sign images) to load.
          { key: 'Cross-Origin-Embedder-Policy', value: 'credentialless' },
        ],
      },
      {
        // Browsers must always re-check the service worker so updates reach installed apps.
        source: '/sw.js',
        headers: [
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
          { key: 'Content-Type', value: 'application/javascript; charset=utf-8' },
        ],
      },
    ];
  },
  turbopack: {},
};

export default nextConfig;
