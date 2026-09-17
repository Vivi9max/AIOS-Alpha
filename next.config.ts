import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    outputFileTracingIncludes: {
      "/*": [
        "./node_modules/ffmpeg-static/ffmpeg",
      ],
    },
  },
};

export default nextConfig;
