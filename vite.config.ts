import { defineConfig } from "vite";

export default defineConfig({
    base: "./",
    build: {
        outDir: "../../dist/claude-thunder",
        emptyOutDir: true
    },
});
