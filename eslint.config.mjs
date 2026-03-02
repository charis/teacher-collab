import eslintPluginUnusedImports from "eslint-plugin-unused-imports";
import eslintPluginTs from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import eslintPluginReactHooks from "eslint-plugin-react-hooks";

export default [
  // Ignore generated/build files
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "dist/**",
      ".vercel/**",
      "prisma/scripts/**",
      "tailwind.config.js",
    ],
  },

  // Apply to all JS/TS/TSX/JSX source files
  {
    files: ["**/*.{ts,tsx,js,jsx}"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 2020,
        sourceType: "module",
        ecmaFeatures: { jsx: true },
        project: "./tsconfig.json",
      },
    },
    plugins: {
      "unused-imports": eslintPluginUnusedImports,
      "@typescript-eslint": eslintPluginTs,
      "react-hooks": eslintPluginReactHooks,
    },
    rules: {
      // TypeScript unused variables (ignore _ prefix)
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          vars: "all",
          args: "after-used",
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
        },
      ],

      // Plain ESLint rule also ignoring _ prefix (Option 2)
      "no-unused-vars": [
        "error",
        {
          vars: "all",
          args: "after-used",
          ignoreRestSiblings: false,
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
        },
      ],

      // Fail on unused imports
      "unused-imports/no-unused-imports": "error",

      // React hooks rules
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
    },
  },
];

/*
import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";
import eslintPluginUnusedImports from "eslint-plugin-unused-imports";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});


const eslintConfig = [
  // Convert legacy Next.js configs safely
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    // Custom rules
    plugins: {
      "unused-imports": eslintPluginUnusedImports,
    },
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          vars: "all",
          args: "after-used",
          argsIgnorePattern: "^_", // Ignore unused function arguments that start with an underscore
          varsIgnorePattern: "^_", // Ignore unused variables that start with an underscore
        },
      ],
      // Fail on unused imports
      "unused-imports/no-unused-imports": "error",
    },
  },
];

export default eslintConfig;
*/