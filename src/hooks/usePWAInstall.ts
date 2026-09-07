import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

function isStandaloneDisplayMode(): boolean {
  if (typeof window === "undefined") return false;
  // Android/desktop (Chrome/Edge) reportam via matchMedia; iOS Safari
  // usa a propriedade não padronizada `navigator.standalone`.
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function isIosDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

interface UsePWAInstallResult {
  /** true quando o navegador dispara `beforeinstallprompt` (Chrome/Edge/Android) e o app ainda não foi instalado. */
  canInstall: boolean;
  /** true quando a Tekidu já está rodando em modo standalone (instalada). */
  isInstalled: boolean;
  /** true em Safari/iOS, onde não existe `beforeinstallprompt` — o único caminho é a instrução manual de "Adicionar à Tela de Início". */
  isIos: boolean;
  /** Dispara o prompt nativo de instalação. Resolve para o resultado escolhido pelo usuário, ou `null` se não havia prompt disponível. */
  promptInstall: () => Promise<"accepted" | "dismissed" | null>;
}

/**
 * Centraliza o ciclo de vida de instalação da PWA (ETAPA 10/11 do
 * prompt): captura e guarda o evento `beforeinstallprompt` (que o
 * navegador só dispara uma vez e não pode ser recriado), expõe uma
 * função para disparar o prompt quando o usuário decidir instalar, e
 * detecta tanto o modo standalone (já instalado) quanto iOS (onde o
 * evento nunca existe).
 */
export function usePWAInstall(): UsePWAInstallResult {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(isStandaloneDisplayMode);
  const [isIos] = useState(isIosDevice);

  useEffect(() => {
    function handleBeforeInstallPrompt(event: Event) {
      // Impede o mini-infobar automático do Chrome — a Tekidu decide
      // quando e onde mostrar o convite de instalação (ETAPA 9: nunca
      // um popup imediato/invasivo).
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    }

    function handleAppInstalled() {
      setIsInstalled(true);
      setDeferredPrompt(null);
    }

    const mql = window.matchMedia("(display-mode: standalone)");
    function handleDisplayModeChange(e: MediaQueryListEvent) {
      setIsInstalled(e.matches);
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);
    mql.addEventListener("change", handleDisplayModeChange);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
      mql.removeEventListener("change", handleDisplayModeChange);
    };
  }, []);

  async function promptInstall() {
    if (!deferredPrompt) return null;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    // O evento só pode ser usado uma vez — descarta após o uso para
    // evitar tentativas de reaproveitá-lo (ETAPA 10: evitar múltiplas
    // instalações/prompts duplicados).
    setDeferredPrompt(null);
    return outcome;
  }

  return {
    canInstall: deferredPrompt !== null && !isInstalled,
    isInstalled,
    isIos: isIos && !isInstalled,
    promptInstall,
  };
}
