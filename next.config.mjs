/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        pathname: "/**",
      },
    ],
  },
  async redirects() {
    return [
      {
        source: "/booking",
        destination: "/order",
        permanent: true,
      },
    ];
  },
  async rewrites() {
    return {
      // Checked before public/ is served: a database file that ends up under
      // public/ (as jar.db once did) is answered with 404 instead of downloaded.
      beforeFiles: [
        {
          source: "/:path*.db",
          destination: "/api/blocked",
        },
        {
          source: "/:path*.db-wal",
          destination: "/api/blocked",
        },
        {
          source: "/:path*.db-shm",
          destination: "/api/blocked",
        },
        {
          source: "/:path*.db-journal",
          destination: "/api/blocked",
        },
        {
          source: "/:path*.sqlite",
          destination: "/api/blocked",
        },
        {
          source: "/:path*.sqlite3",
          destination: "/api/blocked",
        },
      ],
      afterFiles: [],
      fallback: [],
    };
  },
};

export default nextConfig;

