/**
 * P2-05 — Runner de pruebas unificado del monorepo TPL.
 * Ejecuta todas las suites de pruebas unitarias (*.test.ts)
 * reportando el resultado consolidado en una sola salida.
 */
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const testFiles = [
  "packages/core/src/__tests__/normalizeProperty.test.ts",
  "packages/core/src/__tests__/search.test.ts",
  "packages/core/src/__tests__/cotizador.test.ts",
  "apps/publico/lib/propietario/__tests__/presentation.test.ts",
  "apps/publico/lib/search/__tests__/presentation.test.ts",
  "apps/publico/components/search/__tests__/searchState.test.ts",
  "apps/publico/lib/images/__tests__/resolvePropertyImageUrl.test.ts",
  "apps/publico/lib/publicar/__tests__/wizardState.test.ts",
  "apps/publico/lib/search/__tests__/houseAdapter.test.ts",
  "apps/publico/lib/search/__tests__/searchProperties.test.ts",
];

console.log(`\n=== TPL TEST RUNNER — Ejecutando ${testFiles.length} suites de pruebas ===\n`);

let failedSuites = 0;
let passedSuites = 0;

for (const file of testFiles) {
  const filePath = resolve(process.cwd(), file);
  console.log(`▶ [SUITE] ${file}`);

  const isWindows = process.platform === "win32";
  const cmd = isWindows ? "cmd.exe" : "npx";
  const args = isWindows ? ["/c", "npx", "tsx", filePath] : ["tsx", filePath];

  const result = spawnSync(cmd, args, {
    stdio: "inherit",
    encoding: "utf-8",
    env: process.env,
  });

  if (result.status === 0) {
    passedSuites++;
    console.log(`✓ PASÓ: ${file}\n`);
  } else {
    failedSuites++;
    console.error(`✗ FALLÓ: ${file} (código ${result.status})\n`);
  }
}

console.log("==================================================");
console.log(`Resultados finales: ${passedSuites} suites pasadas, ${failedSuites} fallidas.`);
console.log("==================================================\n");

if (failedSuites > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
