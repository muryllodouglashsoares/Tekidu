import { useEffect, useState } from "react";
import { WifiOff, Wifi } from "lucide-react";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { useIsMobile } from "@/hooks/useMediaQuery";

const RECONNECTED_VISIBLE_MS = 3000;

/**
 * Indicador discreto e global de conectividade (ETAPA 7/8 do prompt
 * PWA). Fica montado uma única vez em `AppShell` — nunca dentro de
 * páginas específicas — e:
 *  - aparece enquanto `navigator.onLine` é `false`, avisando que os
 *    dados podem estar desatualizados (nunca finge sincronização);
 *  - some automaticamente alguns segundos depois que a conexão volta,
 *    mostrando antes uma confirmação breve de "Conexão restaurada.".
 *
 * Não é um Toast (aquele é para feedback de ações do usuário) — este
 * reflete o estado da rede, então usa seu próprio `aria-live` para ser
 * anunciado por leitores de tela sem depender do ToastProvider.
 */
export function OfflineIndicator() {
  const isOnline = useOnlineStatus();
  const isMobile = useIsMobile();
  const [showReconnected, setShowReconnected] = useState(false);
  const [wasOffline, setWasOffline] = useState(!isOnline);

  useEffect(() => {
    if (!isOnline) {
      setWasOffline(true);
      setShowReconnected(false);
      return;
    }

    if (wasOffline) {
      setShowReconnected(true);
      const timer = setTimeout(() => {
        setShowReconnected(false);
        setWasOffline(false);
      }, RECONNECTED_VISIBLE_MS);
      return () => clearTimeout(timer);
    }
  }, [isOnline, wasOffline]);

  const visible = !isOnline || showReconnected;
  if (!visible) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-x-0 z-40 flex justify-center px-4 motion-safe:transition-all motion-safe:duration-300"
      style={{
        bottom: isMobile
          ? "calc(var(--tk-bottom-nav-h) + var(--tk-safe-bottom) + 0.75rem)"
          : "1rem",
      }}
    >
      <div
        className={`flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-medium shadow-card motion-safe:animate-[tk-sheet-up_0.22s_ease-out] ${
          isOnline
            ? "border-success/30 bg-success/10 text-success-700"
            : "border-line bg-surface text-ink-600"
        }`}
      >
        {isOnline ? (
          <>
            <Wifi className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            Conexão restaurada.
          </>
        ) : (
          <>
            <WifiOff className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            Você está offline. Algumas informações podem não estar atualizadas.
          </>
        )}
      </div>
    </div>
  );
}
