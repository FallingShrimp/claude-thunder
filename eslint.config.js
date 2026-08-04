import eslint from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
    {
        ignores: ["dist/**", "node_modules/**"],
    },
    eslint.configs.recommended,
    ...tseslint.configs.strict,
    {
        files: ["src/**/*.ts"],
        languageOptions: {
            parserOptions: {
                projectService: true,
                tsconfigRootDir: import.meta.dirname,
            },
        },
        rules: {
            indent: ["error", 4, { SwitchCase: 1 }],
            quotes: ["error", "double", { avoidEscape: true }],
            semi: ["error", "always"],
        },
    },
);
