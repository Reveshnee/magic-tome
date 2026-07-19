/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Permanent redirects from old content-type slugs → new garden-name slugs
  async redirects() {
    return [
      { source: '/cur8/youtube',   destination: '/cur8/koi-pond',    permanent: true },
      { source: '/cur8/tiktok',    destination: '/cur8/the-current', permanent: true },
      { source: '/cur8/instagram', destination: '/cur8/greenhouse',  permanent: true },
      { source: '/cur8/facebook',  destination: '/cur8/sanctuary',   permanent: true },
      { source: '/cur8/articles',  destination: '/cur8/the-grove',   permanent: true },
      { source: '/cur8/images',    destination: '/cur8/ember',        permanent: true },
      { source: '/cur8/documents', destination: '/cur8/bloom',        permanent: true },
      { source: '/cur8/web',       destination: '/cur8/the-tide',     permanent: true },
    ]
  },
}

export default nextConfig
