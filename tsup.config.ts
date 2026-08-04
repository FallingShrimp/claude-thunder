import { defineConfig } from "tsup";

export default defineConfig({
    entry: {
        index: "src/index.ts",
        game: "src/game/index.ts",
    },
    format: ["esm"],
    dts: true,
    clean: true,
});
