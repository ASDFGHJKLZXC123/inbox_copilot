import path from "node:path";

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  typedRoutes: true,
  outputFileTracingRoot: path.join(__dirname),
  transpilePackages: ["@phosphor-icons/react"],
};

export default nextConfig;
