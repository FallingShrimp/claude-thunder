import { defineConfig } from 'tsup';

export default defineConfig({
    entry: { game: 'src/main.ts' },
    format: ['esm'],
    target: 'es2022',
    outDir: 'dist',
    clean: true,
    sourcemap: true,
    minify: false,
    splitting: false,
    dts: false,
});
