import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'MyClass - Aplikasi Monitoring Kelas & Keaktifan Murid',
    short_name: 'MyClass',
    description:
      'Pantau kehadiran harian, poin keaktifan, karya kreativitas, dan ibadah mandiri anak secara real-time.',
    start_url: '/',
    display: 'standalone',
    background_color: '#f8fafc',
    theme_color: '#4f46e5',
    orientation: 'portrait',
    icons: [
      {
        src: '/myclass.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/myclass.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/myclass-maskable.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  }
}
