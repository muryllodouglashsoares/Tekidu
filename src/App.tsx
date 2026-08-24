import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ToastProvider } from "@/contexts/ToastContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { AppRoutes } from "@/routes/AppRoutes";

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <AuthProvider>
          {/* ToastProvider fica dentro do Router (não usa navegação) e
              envolve todas as rotas — o mesmo padrão de feedback de
              sucesso/erro (Fase 6) precisa estar disponível tanto nas
              telas protegidas quanto no login (ex.: falha ao entrar). */}
          <ToastProvider>
            <AppRoutes />
          </ToastProvider>
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  );
}
