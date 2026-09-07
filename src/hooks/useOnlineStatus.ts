import { useEffect, useState } from "react";

/**
 * Assina `navigator.onLine` e os eventos `online`/`offline` da janela,
 * centralizando a detecção de conectividade num único lugar (PWA —
 * ver `OfflineIndicator`, que é o único consumidor esperado deste
 * hook). Evita duplicar `addEventListener("online"/"offline", ...)`
 * em várias páginas, cada uma com seu próprio cleanup.
 *
 * IMPORTANTE: `navigator.onLine` só reflete a conectividade da
 * interface de rede do dispositivo (Wi-Fi/dados ligados), não se o
 * Firebase/Firestore está de fato alcançável — por isso o indicador
 * derivado deste hook nunca deve afirmar que "os dados estão
 * atualizados", só que a rede está disponível ou não.
 */
export function useOnlineStatus(): boolean {
  const [isOnline, setIsOnline] = useState(() =>
    typeof navigator === "undefined" ? true : navigator.onLine
  );

  useEffect(() => {
    function handleOnline() {
      setIsOnline(true);
    }
    function handleOffline() {
      setIsOnline(false);
    }

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return isOnline;
}
