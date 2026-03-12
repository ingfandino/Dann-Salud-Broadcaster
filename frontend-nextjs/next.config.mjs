/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // ✅ Elevar límite de body para server actions (seguridad general)
  experimental: {
    serverActions: {
      bodySizeLimit: '105mb',
    },
  },
  outputFileTracingRoot: './',
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:5001/api/:path*',
      },
      {
        source: '/uploads/:path*',
        destination: 'http://localhost:5001/uploads/:path*',
      },
    ]
  },
}

export default nextConfig
