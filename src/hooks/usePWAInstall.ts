import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

// Declarado pelo script inline em index.html — ver comentário lá para
// o porquê da captura acontecer fora do React.
declare global {
  interface Window {
    __tkInstallPrompt?: BeforeInstallPromptEvent | null;
  }
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
 * prompt): lê o evento `beforeinstallprompt` já capturado pelo script
 * inline em `index.html` (que roda antes do bundle React, evitando
 * perder o evento numa corrida contra o carregamento do app), expõe
 * uma função para disparar o prompt quando o usuário decidir instalar,
 * e detecta tanto o modo standalone (já instalado) quanto iOS (onde o
 * evento nunca existe).
 */
export function usePWAInstall(): UsePWAInstallResult {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(
    () => window.__tkInstallPrompt ?? null
  );
  const [isInstalled, setIsInstalled] = useState(isStandaloneDisplayMode);
  const [isIos] = useState(isIosDevice);

  useEffect(() => {
    // Cobre o caso em que o evento chegou entre o script inline e o
    // useState acima ter lido `window.__tkInstallPrompt` (montagem
    // assíncrona do React) — sem isso, ficaria só no `beforeinstall
    // prompt` abaixo, que de novo corre risco de chegar tarde demais.
    function handleCaptured() {
      setDeferredPrompt(window.__tkInstallPrompt ?? null);
    }

    function handleAppInstalled() {
      setIsInstalled(true);
      setDeferredPrompt(null);
    }

    const mql = window.matchMedia("(display-mode: standalone)");
    function handleDisplayModeChange(e: MediaQueryListEvent) {
      setIsInstalled(e.matches);
    }

    // Garante que não perdemos um evento que chegou entre a
    // inicialização do useState e este efeito rodar.
    handleCaptured();

    window.addEventListener("tk:beforeinstallprompt", handleCaptured);
    window.addEventListener("tk:appinstalled", handleAppInstalled);
    window.addEventListener("appinstalled", handleAppInstalled);
    mql.addEventListener("change", handleDisplayModeChange);

    return () => {
      window.removeEventListener("tk:beforeinstallprompt", handleCaptured);
      window.removeEventListener("tk:appinstalled", handleAppInstalled);
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
    window.__tkInstallPrompt = null;
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
