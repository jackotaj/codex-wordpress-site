import coreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

const config = [
  { ignores: [".next/**", "node_modules/**", "next-env.d.ts"] },
  ...coreWebVitals,
  ...nextTypescript,
  { files: ["extension/**/*.js"], languageOptions: { globals: { chrome: "readonly", window: "readonly", location: "readonly", URL: "readonly" } } },
];

export default config;
