import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  js.configs.recommended,
  tseslint.configs.recommended,
  {
    files: ["**/*.ts", "**/*.tsx"],
    ignores: ["**/dist", "**/build"],
    linterOptions: {
      noInlineConfig: true,
      reportUnusedDisableDirectives: "error",
    },
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { varsIgnorePattern: '^BlacklistButler' }],
    },
  },
);
