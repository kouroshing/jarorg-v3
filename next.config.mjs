/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Minimal self-contained output for cPanel / manual deploy (see server.js).
  output: "standalone",
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
