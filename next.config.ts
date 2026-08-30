import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    // OneDrive path + package-lock.json lạc ở thư mục home làm Next đoán sai workspace root
    root: process.cwd(),
  },
  experimental: {
    serverActions: {
      // upload file Excel import món ăn (mặc định 1MB hơi sát)
      bodySizeLimit: "4mb",
    },
  },
};

export default nextConfig;
