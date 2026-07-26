import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Produces a minimal .next/standalone build (only the files actually
  // needed at runtime, deps traced and copied in) - see Dockerfile.
  output: "standalone",
};

export default nextConfig;
