import path from "node:path";
import type { NextConfig } from "next";

// This folder is the project root (silences the "ignored package-lock.json
// outside the repository" warning when a stray lockfile sits in $HOME).
const projectRoot = path.resolve(process.cwd());

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  outputFileTracingRoot: projectRoot,
  experimental: {
    // Dev-only "instant navigation" validation: only for segments that opt in
    // with `export const instant`. Our pages are client-side (localStorage), so
    // validating every page just floods the terminal and costs CPU on slow PCs.
    instantInsights: { validationLevel: "manual-warning" },
  },
  turbopack: {
    root: projectRoot,
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
