/* =============================================================
 * COPIA LOS ASSETS DEL SITIO v1 A public/ PARA DESARROLLO
 *
 * Los ~49 MB de imágenes ya están versionados una vez, en
 * `el-porton-repo-check/assets/`. Copiarlos DENTRO de porton-next y
 * commitearlos los duplicaría en el repositorio para siempre: git
 * guarda todas las versiones de todo, así que borrarlos después NO
 * recupera el espacio ni limpia el historial.
 *
 * Por eso `public/assets` está en .gitignore y se genera con este
 * script. El día del cambio a producción se hará `git mv` de la
 * carpeta original, que la MUEVE sin duplicar historial.
 *
 *   node scripts/copiar-assets.mjs      (o: npm run assets)
 * ============================================================= */

import { cp, stat, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const aqui = dirname(fileURLToPath(import.meta.url));
const origen = resolve(aqui, '..', '..', 'assets');
const destino = resolve(aqui, '..', 'public', 'assets');

if (!existsSync(origen)) {
  console.error(`No encuentro los assets del sitio v1 en:\n  ${origen}`);
  process.exit(1);
}

if (existsSync(destino)) {
  console.log('Borrando la copia anterior…');
  await rm(destino, { recursive: true, force: true });
}

console.log(`Copiando\n  de : ${origen}\n  a  : ${destino}`);
await cp(origen, destino, { recursive: true });

// Comprobación: que el destino pese lo mismo que el origen.
async function pesar(dir) {
  const { readdir } = await import('node:fs/promises');
  let bytes = 0;
  let ficheros = 0;
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) {
      const sub = await pesar(p);
      bytes += sub.bytes;
      ficheros += sub.ficheros;
    } else {
      bytes += (await stat(p)).size;
      ficheros++;
    }
  }
  return { bytes, ficheros };
}

const a = await pesar(origen);
const b = await pesar(destino);
const mb = (n) => (n / 1024 / 1024).toFixed(1) + ' MB';

console.log(`\norigen : ${a.ficheros} ficheros, ${mb(a.bytes)}`);
console.log(`destino: ${b.ficheros} ficheros, ${mb(b.bytes)}`);

if (a.ficheros !== b.ficheros || a.bytes !== b.bytes) {
  console.error('\nLA COPIA NO COINCIDE con el origen.');
  process.exit(1);
}
console.log('\nCopia correcta.');
