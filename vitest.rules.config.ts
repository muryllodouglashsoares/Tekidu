import { defineConfig } from "vitest/config";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Configuração do Vitest dedicada aos testes de Security Rules
 * (`src/security/*.rules.test.ts`).
 *
 * Separada de `vitest.config.ts` de propósito: estes testes exigem o
 * Firestore Emulator rodando (usam `@firebase/rules-unit-testing`
 * para simular usuários com roles diferentes fazendo `create`/`update`
 * diretamente no Firestore, sem passar pela UI) e por isso não devem
 * rodar no `npm test` padrão (rápido, sem dependência externa). Rode
 * com `npm run test:rules`, que já sobe o emulator via
 * `firebase emulators:exec` antes de chamar o Vitest com esta config.
 *
 * `testTimeout` mais alto que o padrão porque cada teste desta suíte
 * faz pelo menos uma chamada de rede ao emulator (mais lenta que os
 * testes puros de `vitest.config.ts`).
 */
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    include: ["src/security/*.rules.test.ts"],
    testTimeout: 20_000,
    hookTimeout: 20_000,
  },
});
