/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Type errors fail the build again. They were ignored, which left the project
  // with no automated check at all — `tsc --noEmit` passes today, so the switch
  // was costing safety and buying nothing.
  eslint: {
    // Still ignored: there is no eslint config in the repo yet, so enabling this
    // would fail the build on missing setup rather than on real problems.
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

