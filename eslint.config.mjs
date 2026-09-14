import tseslint from "typescript-eslint";

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
      "tests/**/*.ts"
    ],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module"
      }
    },
    rules: {
      "eqeqeq": [
        "error",
        "always"
      ],
      "no-constant-condition": "error",
      "no-debugger": "error",
      "no-duplicate-imports": "error",
      "no-unsafe-finally": "error",
      "no-unreachable": "error"
    }
  }
];
