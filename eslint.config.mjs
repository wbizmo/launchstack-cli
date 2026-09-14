import tseslint from "typescript-eslint";

const safetyRules = {
  eqeqeq: ["error", "always"],
  "no-constant-condition": "error",
  "no-debugger": "error",
  "no-duplicate-imports": "error",
  "no-unsafe-finally": "error",
  "no-unreachable": "error"
};

export default [
  {
    ignores: [
      "dist/**",
      "node_modules/**"
    ]
  },
  {
    files: [
      "src/**/*.ts",
      "tests/**/*.ts",
      "bench/**/*.ts"
    ],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module"
      }
    },
    rules: safetyRules
  },
  {
    files: [
      "scripts/**/*.js",
      "scripts/**/*.cjs",
      "scripts/**/*.mjs"
    ],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "commonjs"
    },
    rules: safetyRules
  }
];
