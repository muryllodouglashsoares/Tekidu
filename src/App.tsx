import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ToastProvider } from "@/contexts/ToastContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { AccessibilityProvider } from "@/contexts/AccessibilityContext";
import { AppRoutes } from "@/routes/AppRoutes";
import { OfflineIndicator } from "@/components/pwa/OfflineIndicator";
import { PWAUpdatePrompt } from "@/components/pwa/PWAUpdatePrompt";

export default function App() {
  return (
    <AccessibilityProvider>
    <ThemeProvider>
      <BrowserRouter>
        <AuthProvider>
          {/* ToastProvider fica dentro do Router (não usa navegação) e
              envolve todas as rotas — o mesmo padrão de feedback de
              sucesso/erro (Fase 6) precisa estar disponível tanto nas
              telas protegidas quanto no login (ex.: falha ao entrar). */}
          <ToastProvider>
            <AppRoutes />
            {/* Overlays globais da PWA — fora de qualquer rota
                específica de propósito (ver ETAPA 8 do prompt PWA:
                "não coloque lógica de PWA dentro de páginas
                específicas"), então funcionam tanto nas rotas
                protegidas quanto na Landing Page/Login. */}
            <OfflineIndicator />
            <PWAUpdatePrompt />
          </ToastProvider>
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
    </AccessibilityProvider>
  );
}
