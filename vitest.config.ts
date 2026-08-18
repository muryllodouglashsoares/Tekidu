import { defineConfig } from "vitest/config";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Configuração do Vitest (Tarefa 5, Fase 1 pós-auditoria V8).
 *
 * Não reaproveita `vite.config.ts` diretamente (`mergeConfig`) para
 * evitar carregar o plugin React (`@vitejs/plugin-react`) nos testes —
 * as funções testadas aqui são puras (`types/grade.ts`,
 * `types/attendance.ts`), sem nenhum componente React envolvido, então
 * não há necessidade do plugin nem de um ambiente DOM (`environment`
 * fica no padrão `node`, mais rápido que `jsdom`). O alias `@/*` é
 * duplicado do `vite.config.ts` para que os testes possam importar do
 * mesmo jeito que o resto do projeto (`@/types/grade`), sem precisar de
 * caminhos relativos frágeis.
 */
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    include: ["src/**/*.test.ts"],
  },
});
