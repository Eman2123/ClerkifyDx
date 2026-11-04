// Bundles the Express API into one self-contained CommonJS file for Vercel: ../api/index.js
import { build } from "esbuild";

await build({
  entryPoints: ["src/vercel.ts"],
  outfile: "../api/index.js",
  bundle: true,
  platform: "node",
  target: "node22",
  format: "cjs",
  external: ["pg-native"],
  define: { "import.meta.url": "__importMetaUrl" },
  banner: { js: 'const __importMetaUrl = require("node:url").pathToFileURL(__filename).href;' },
  footer: { js: "module.exports = module.exports.default;" },
  legalComments: "none",
  logLevel: "info",
});
