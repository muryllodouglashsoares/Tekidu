import { useCallback, useEffect, useState } from "react";
import {
  disablePushNotifications,
  enablePushNotifications,
  isPushSupported,
} from "@/services/push/pushNotificationService";
import { getOwnPushTokens } from "@/services/push/pushTokenService";
import type { PushPermissionState } from "@/types/pushToken";

interface UsePushNotificationsResult {
  status: PushPermissionState;
  /** Quantos dispositivos/navegadores deste usuário têm push ativo hoje (ETAPA 19). */
  activeDeviceCount: number;
  loading: boolean;
  actionPending: boolean;
  error: string | null;
  enable: () => Promise<void>;
  disable: () => Promise<void>;
}

/**
 * Hook único consumido pela UI (ETAPA 5: "a lógica de Push deve ficar
 * isolada em um serviço/hook apropriado, não amarrada a componentes").
 */
export function usePushNotifications(uid: string | undefined): UsePushNotificationsResult {
  const [status, setStatus] = useState<PushPermissionState>(() =>
    isPushSupported() ? "disabled" : "unsupported"
  );
  const [activeDeviceCount, setActiveDeviceCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [actionPending, setActionPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!uid || !isPushSupported()) {
      setStatus(isPushSupported() ? "disabled" : "unsupported");
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const permission = Notification.permission;
      if (permission === "denied") {
        setStatus("denied");
        setActiveDeviceCount(0);
        return;
      }
      const tokens = await getOwnPushTokens(uid);
      const active = tokens.filter((t) => t.status === "active");
      setActiveDeviceCount(active.length);
      setStatus(permission === "granted" && active.length > 0 ? "enabled" : "disabled");
    } catch (err) {
      console.error("[usePushNotifications] Falha ao ler estado de push", err);
    } finally {
      setLoading(false);
    }
  }, [uid]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const enable = useCallback(async () => {
    if (!uid) return;
    setActionPending(true);
    setError(null);
    try {
      await enablePushNotifications(uid);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível ativar as notificações.");
      await refresh();
    } finally {
      setActionPending(false);
    }
  }, [uid, refresh]);

  const disable = useCallback(async () => {
    if (!uid) return;
    setActionPending(true);
    setError(null);
    try {
      await disablePushNotifications(uid);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível desativar as notificações.");
      await refresh();
    } finally {
      setActionPending(false);
    }
  }, [uid, refresh]);

  return { status, activeDeviceCount, loading, actionPending, error, enable, disable };
}
