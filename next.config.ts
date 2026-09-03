import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    // A stray OneDrive path and package-lock.json in the home directory make Next infer the wrong workspace root
    root: process.cwd(),
  },
  experimental: {
    serverActions: {
      // Excel upload for food import (the default 1MB limit is too tight)
      bodySizeLimit: "4mb",
    },
  },
};

export default nextConfig;
