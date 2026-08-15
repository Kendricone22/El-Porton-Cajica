import { defineConfig } from 'vitest/config';

/**
 * Vitest solo se usa en desarrollo: es una devDependency, así que no
 * viaja ni un byte al navegador ni al servidor de producción.
 *
 * Extensión `.mts` (no `.ts`) porque package.json no declara
 * "type": "module", y sin eso Node intentaría cargar este archivo como
 * CommonJS y fallaría al ver `import`.
 *
 * `resolve.tsconfigPaths` hace que el alias `@/...` funcione también en
 * las pruebas. Vite lo resuelve de forma nativa, así que no hace falta
 * el plugin vite-tsconfig-paths.
 */
export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
