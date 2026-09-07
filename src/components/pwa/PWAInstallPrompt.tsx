import { useState } from "react";
import { Download, Share, SquarePlus, CheckCircle2, Smartphone } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { usePWAInstall } from "@/hooks/usePWAInstall";
import { useToast } from "@/contexts/ToastContext";

/**
 * Convite de instalação da PWA (ETAPA 9/12/13 do prompt). Vive dentro
 * de Configurações — nunca como popup automático ao abrir o app — e
 * se adapta a três cenários:
 *  - já instalada: mostra uma confirmação, sem botão de ação;
 *  - Chrome/Edge/Android (`beforeinstallprompt` disponível): botão que
 *    dispara o prompt nativo;
 *  - iOS/Safari (sem `beforeinstallprompt`): passo a passo manual, o
 *    único caminho possível na plataforma.
 * Se nenhum desses se aplica (ex.: Firefox desktop, sem suporte a
 * instalação), o componente não renderiza nada — não faz sentido
 * mostrar um convite que não pode ser concluído.
 */
export function PWAInstallPrompt() {
  const { canInstall, isInstalled, isIos, promptInstall } = usePWAInstall();
  const { error } = useToast();
  const [installing, setInstalling] = useState(false);

  async function handleInstall() {
    setInstalling(true);
    try {
      const outcome = await promptInstall();
      if (outcome === "dismissed") {
        // Usuário decidiu não instalar agora — não é um erro, só não
        // mostra nada (o botão volta a ficar disponível naturalmente
        // se o navegador disparar `beforeinstallprompt` de novo).
      }
    } catch {
      error("Não foi possível iniciar a instalação. Tente novamente.");
    } finally {
      setInstalling(false);
    }
  }

  if (isInstalled) {
    return (
      <Card className="p-5">
        <h3 className="mb-1 flex items-center gap-2 font-display text-base font-semibold text-ink900">
          <Smartphone className="h-4 w-4 text-ink-500" aria-hidden="true" />
          Aplicativo
        </h3>
        <p className="flex items-center gap-1.5 text-sm text-success-700">
          <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
          A Tekidu já está instalada neste dispositivo.
        </p>
      </Card>
    );
  }

  if (canInstall) {
    return (
      <Card className="p-5">
        <h3 className="mb-1 flex items-center gap-2 font-display text-base font-semibold text-ink900">
          <Smartphone className="h-4 w-4 text-ink-500" aria-hidden="true" />
          Aplicativo
        </h3>
        <p className="mb-4 text-sm text-ink-500">
          Instale a Tekidu neste dispositivo para abrir direto da tela inicial, em uma janela
          própria, sem a barra de endereço do navegador.
        </p>
        <Button onClick={handleInstall} loading={installing}>
          <Download className="h-4 w-4" aria-hidden="true" />
          Instalar aplicativo
        </Button>
      </Card>
    );
  }

  if (isIos) {
    return (
      <Card className="p-5">
        <h3 className="mb-1 flex items-center gap-2 font-display text-base font-semibold text-ink900">
          <Smartphone className="h-4 w-4 text-ink-500" aria-hidden="true" />
          Aplicativo
        </h3>
        <p className="mb-3 text-sm text-ink-500">Para instalar a Tekidu neste iPhone/iPad:</p>
        <ol className="flex flex-col gap-2 text-sm text-ink-600">
          <li className="flex items-center gap-2">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-ink-100 text-xs font-semibold text-ink-700">
              1
            </span>
            Toque em
            <Share className="h-4 w-4 shrink-0 text-ink-500" aria-hidden="true" />
            Compartilhar, na barra do Safari.
          </li>
          <li className="flex items-center gap-2">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-ink-100 text-xs font-semibold text-ink-700">
              2
            </span>
            Selecione
            <SquarePlus className="h-4 w-4 shrink-0 text-ink-500" aria-hidden="true" />
            "Adicionar à Tela de Início".
          </li>
        </ol>
      </Card>
    );
  }

  // Nenhum dos três cenários acima se aplica: o navegador não disparou
  // `beforeinstallprompt` (Chrome/Edge com critérios de instalabilidade
  // não atendidos, ou navegador sem suporte, como Firefox/Safari
  // desktop). Mostrar essa explicação — em vez de simplesmente não
  // renderizar nada — evita que pareça um bug quando na verdade é uma
  // limitação conhecida da plataforma.
  return (
    <Card className="p-5">
      <h3 className="mb-1 flex items-center gap-2 font-display text-base font-semibold text-ink900">
        <Smartphone className="h-4 w-4 text-ink-500" aria-hidden="true" />
        Aplicativo
      </h3>
      <p className="text-sm text-ink-500">
        A instalação como aplicativo não está disponível neste navegador. Tente pelo Chrome ou
        Edge (Android/desktop) ou, no iPhone/iPad, pelo Safari.
      </p>
    </Card>
  );
}
