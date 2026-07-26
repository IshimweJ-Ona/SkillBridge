import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // eslint-plugin-react-hooks v7 (bundled by eslint-config-next 16) adds
      // React Compiler-oriented rules that flag the standard "fetch/hydrate
      // on mount" effect pattern used throughout this app (data fetching,
      // reading localStorage post-hydration). This project doesn't opt into
      // the React Compiler; kept as warnings rather than disabled so the
      // signal stays visible without blocking the build on idiomatic code.
      "react-hooks/set-state-in-effect": "warn",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
