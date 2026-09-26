import { defineConfig } from "vite";

export default defineConfig({
    base: "/claude-thunder/",
    build: {
        outDir: "dist",
        emptyOutDir: true,
    },
});
