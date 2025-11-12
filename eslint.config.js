import pluginObsidianmd from "eslint-plugin-obsidianmd";

export default [
  {
    files: ["main.ts"],
    languageOptions: {
      parser: await import("@typescript-eslint/parser"),
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
      },
    },
    plugins: {
      obsidianmd: pluginObsidianmd,
    },
    rules: {
      ...pluginObsidianmd.configs.recommended.rules,
      "obsidianmd/ui/sentence-case": [
        "warn",
        {
          brands: ["Claude"],
          acronyms: ["API", "AI"],
        },
      ],
    },
  },
];
