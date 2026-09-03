import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["192.168.1.2"],
  experimental: {
    // Upload forms accept files up to 5 MB. Server Actions default to 1 MB,
    // so leave enough room for the PDF plus multipart form metadata.
    serverActions: {
      bodySizeLimit: "6mb",
    },
  },
};

export default nextConfig;
