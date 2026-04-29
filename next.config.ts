import type { NextConfig } from "next";
import { reatomTurbopackRules } from "./reatom-temporary-patch.mjs";

const nextConfig: NextConfig = {
  turbopack: {
    rules: {
      ...reatomTurbopackRules,
    },
  },
};

export default nextConfig;
