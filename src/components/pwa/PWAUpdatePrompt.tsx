import { useRegisterSW } from "virtual:pwa-register/react";
import { RefreshCw, X } from "lucide-react";
import { Button } from "@/components/ui/Button";

/**
 * Notifica sobre uma nova versão da Tekidu já disponível (ETAPA 14/15
 * do prompt), sem nunca recarregar sozinho. Fica montado globalmente
 * (ver AppShell) e só aparece quando o Service Worker detecta um novo
 * build em "waiting" — o usuário decide o momento de atualizar, o que
 * evita interromper alguém no meio de um lançamento de notas/cadastro
 * de aluno e evita o erro clássico de chunk removido
 * ("Failed to fetch dynamically imported module") após um novo deploy
 * com `registerType: "prompt"` + `skipWaiting: false` no vite.config.
 */
export function PWAUpdatePrompt() {
  const { needRefresh: [needRefresh, setNeedRefresh], updateServiceWorker } = useRegisterSW({
    onRegisteredSW(_url, registration) {
      // Verifica periodicamente se existe um novo Service Worker no
      // servidor, sem depender só de o usuário recarregar a aba
      // manualmente (sessões longas de dashboard aberto o dia todo).
      if (!registration) return;
      const ONE_HOUR = 60 * 60 * 1000;
      setInterval(() => {
        registration.update().catch(() => {
          // Falha de rede ao checar atualização não é um erro do
          // usuário — ignora silenciosamente, tenta de novo no
          // próximo intervalo.
        });
      }, ONE_HOUR);
    },
  });

  if (!needRefresh) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-x-0 top-0 z-40 flex justify-center px-4 pt-safe motion-safe:animate-[tk-sheet-up_0.22s_ease-out]"
      style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 0.75rem)" }}
    >
      <div className="flex items-center gap-3 rounded-full border border-line bg-surface px-4 py-2 shadow-card">
        <RefreshCw className="h-4 w-4 shrink-0 text-ink-700" aria-hidden="true" />
        <p className="text-xs font-medium text-ink-700">
          Uma nova versão da Tekidu está disponível.
        </p>
        <Button size="sm" onClick={() => updateServiceWorker(true)}>
          Atualizar
        </Button>
        <button
          type="button"
          onClick={() => setNeedRefresh(false)}
          aria-label="Dispensar aviso de atualização"
          className="rounded-full p-1 text-ink-400 hover:bg-ink-50 hover:text-ink-700"
        >
          <X className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
