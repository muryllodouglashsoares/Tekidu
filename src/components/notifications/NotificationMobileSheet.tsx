import type { ReactNode } from "react";
import { MobileSheet } from "@/components/mobile/MobileSheet";

interface NotificationMobileSheetProps {
  open: boolean;
  onClose: () => void;
  headerAction: ReactNode;
  children: ReactNode;
}

/**
 * Módulo separado só para isolar a dependência de `MobileSheet`
 * (Framer Motion) num chunk próprio, carregado sob demanda (ver
 * `lazy()` em NotificationCenter.tsx). `NotificationCenter` é
 * renderizado em TODA rota protegida via `AppShell`/`MobileHeader` —
 * se importasse `MobileSheet` diretamente, o Framer Motion entraria
 * no bundle principal para 100% dos usuários (incluindo desktop, que
 * nunca vê este painel), quebrando a mesma estratégia de code-splitting
 * já documentada em `AppRoutes.tsx` ("só a Landing Page paga o custo
 * do Framer Motion").
 */
export function NotificationMobileSheet({ open, onClose, headerAction, children }: NotificationMobileSheetProps) {
  return (
    <MobileSheet open={open} onClose={onClose} title="Notificações" headerAction={headerAction}>
      {children}
    </MobileSheet>
  );
}
