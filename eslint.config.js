import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist/**", "node_modules/**", "work/**", ".wrangler/**", "test-results/**"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: { "no-undef": "off" },
  },
  {
    files: ["src/**/*.{js,jsx,ts,tsx}", "functions/**/*.{js,ts}", "workers/**/*.{js,ts}", "shared/**/*.ts"],
    languageOptions: { parserOptions: { ecmaFeatures: { jsx: true } } },
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": ["error", { "argsIgnorePattern": "^_", "varsIgnorePattern": "^_" }],
      "no-unused-vars": "off",
      "no-undef": "off"
    }
  }
);
