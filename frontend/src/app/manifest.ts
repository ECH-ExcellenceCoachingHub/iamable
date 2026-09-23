import type { MetadataRoute } from 'next';

export const dynamic = 'force-static';

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: 'Am Able — Sign Language Translation',
    short_name: 'Am Able',
    description: 'AI-powered sign language translation. Real-time translation for deaf and hard-of-hearing users.',
    start_url: '/dashboard',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#f7f8fb',
    theme_color: '#1d58f1',
    categories: ['accessibility', 'education', 'utilities'],
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/maskable-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
      { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    shortcuts: [
      { name: 'Text to Sign', url: '/dashboard/text-to-sign', icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }] },
      { name: 'Voice to Sign', url: '/dashboard/voice', icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }] },
      { name: 'Sign to Text', url: '/dashboard/translation', icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }] },
    ],
  };
}
