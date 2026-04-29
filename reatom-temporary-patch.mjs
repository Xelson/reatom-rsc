import { fileURLToPath } from "node:url";

const loaderPath = fileURLToPath(import.meta.url);

export default function reatomLoader(source) {
  if (!source.includes("package duplication")) return source;

  return source
    .replace(
      /throw\s+new\s+\w+\s*\(\s*['"]package duplication['"]\s*\)/g,
      "void 0",
    )
    .replace(
      /globalThis\.__REATOM\s*=\s*\[\s*\]/g,
      "(globalThis.__REATOM??=[])",
    );
}

export const reatomWebpackRule = {
  test: /node_modules[\\/]@reatom[\\/]core[\\/].*\.(m?js|cjs)$/,
  use: [loaderPath],
};

export const reatomTurbopackRules = {
  "**/node_modules/@reatom/core/**/*.{js,mjs,cjs}": {
    loaders: [loaderPath],
  },
};
