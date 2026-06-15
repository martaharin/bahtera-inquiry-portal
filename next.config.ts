import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,

  async redirects() {
    return [
      {
        source: "/", // The path users try to visit
        destination: "/auth/login", // The path you want to send them to
        permanent: true, // true = 308 permanent, false = 307 temporary
      },
    ];
  },
  async headers() {
    return [
      {
        source: "/api/:path*", // Match all API routes
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" }, // Replace '*' with specific origin if needed
          {
            key: "Access-Control-Allow-Methods",
            value: "GET, POST, PUT, DELETE",
          },
          {
            key: "Access-Control-Allow-Headers",
            value: "Content-Type, Authorization",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
