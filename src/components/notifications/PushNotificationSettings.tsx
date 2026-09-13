import { Bell, BellOff, BellRing, CheckCircle2, Smartphone } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/contexts/AuthContext";
import { usePushNotifications } from "@/hooks/usePushNotifications";

/**
 * Ativação/desativação de notificações push (ETAPA 14/15/16 do prompt
 * de Push). Vive em Configurações → Preferências, no mesmo espírito de
 * `PWAInstallPrompt`: nunca um popup automático, sempre uma ação
 * explícita do usuário — o `Notification.requestPermission()` só
 * acontece dentro de `enable()`, disparado pelo clique no botão abaixo.
 */
export function PushNotificationSettings() {
  const { profile } = useAuth();
  const { status, activeDeviceCount, loading, actionPending, error, enable, disable } =
    usePushNotifications(profile?.uid);

  if (status === "unsupported") {
    return (
      <Card className="p-5">
        <h3 className="mb-1 flex items-center gap-2 font-display text-base font-semibold text-ink900">
          <BellOff className="h-4 w-4 text-ink-500" aria-hidden="true" />
          Notificações push
        </h3>
        <p className="text-sm text-ink-500">
          Este navegador/dispositivo não tem suporte a notificações push. Você continua recebendo
          todas as notificações normalmente dentro da Tekidu.
        </p>
      </Card>
    );
  }

  return (
    <Card className="p-5">
      <h3 className="mb-1 flex items-center gap-2 font-display text-base font-semibold text-ink900">
        <Bell className="h-4 w-4 text-ink-500" aria-hidden="true" />
        Notificações push
      </h3>
      <p className="mb-4 text-sm text-ink-500">
        Receba avisos importantes da Tekidu mesmo quando não estiver com a plataforma aberta. Isso
        não substitui o sino de notificações — os dois continuam funcionando juntos.
      </p>

      {loading ? (
        <p className="text-sm text-ink-500">Verificando estado…</p>
      ) : status === "denied" ? (
        <div className="flex items-start gap-2 rounded-2xl bg-ink-50 p-3 text-sm text-ink-600">
          <BellOff className="mt-0.5 h-4 w-4 shrink-0 text-ink-400" aria-hidden="true" />
          <span>
            As notificações foram bloqueadas nas configurações do navegador. Para reativar,
            permita notificações para a Tekidu nas configurações do site (ícone de cadeado/
            informações ao lado do endereço) e recarregue a página.
          </span>
        </div>
      ) : status === "enabled" ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="flex items-center gap-1.5 text-sm text-success-700">
            <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
            Ativadas neste dispositivo
            {activeDeviceCount > 1 && (
              <span className="ml-1 inline-flex items-center gap-1 text-ink-500">
                <Smartphone className="h-3.5 w-3.5" aria-hidden="true" />
                {activeDeviceCount} dispositivos com push ativo
              </span>
            )}
          </p>
          <Button variant="secondary" size="sm" onClick={disable} loading={actionPending}>
            Desativar neste dispositivo
          </Button>
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-ink-500">Desativadas neste dispositivo.</p>
          <Button size="sm" onClick={enable} loading={actionPending}>
            <BellRing className="h-4 w-4" aria-hidden="true" />
            Ativar notificações
          </Button>
        </div>
      )}

      {error && <p className="mt-3 text-sm text-danger">{error}</p>}
    </Card>
  );
}
