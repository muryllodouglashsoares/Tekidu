/**
 * Link "Pular para o conteúdo principal" — só
 * fica visível quando recebe foco por teclado, permitindo pular
 * Header/Sidebar diretamente para `<main id="main-content">` (ver
 * AppShell).
 */
export function SkipLink() {
  return (
    <a href="#main-content" className="tk-skip-link">
      Pular para o conteúdo principal
    </a>
  );
}
