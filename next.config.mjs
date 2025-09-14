/** @type {import("next").NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cdn.sanity.io",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
      {
        protocol: "https",
        hostname: "avatars.githubusercontent.com",
      },
      {
        protocol: "https",
        hostname: "pub-b7fd9c30cdbf439183b75041f5f71b92.r2.dev",
      },
    ],
  },

  devIndicators: {
    buildActivity: false,
  },

  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "http://103.197.190.167:8080/:path*",
      },
    ];
  },
};

export default nextConfig;
