/**
 * Ícone de marca do Tekidu — o mesmo traço diagonal terminando em
 * ponto usado na Landing Page (motivo de trajetória/evolução), como
 * componente estático (sem framer-motion) para poder ser usado em
 * telas fora do bundle lazy da landing, como o Login.
 */
export function BrandMark({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M5 19 L18 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="18.5" cy="5.5" r="2" fill="currentColor" />
    </svg>
  );
}
