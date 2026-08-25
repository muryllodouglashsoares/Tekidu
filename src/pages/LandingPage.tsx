import { LandingNavbar } from "./landing/LandingNavbar";
import { HeroSection } from "./landing/HeroSection";
import { ProblemSection } from "./landing/ProblemSection";
import { FlowSection } from "./landing/FlowSection";
import { EvolutionSection } from "./landing/EvolutionSection";
import { PersonasSection } from "./landing/PersonasSection";
import { SecuritySection } from "./landing/SecuritySection";
import { ClosingCtaSection } from "./landing/ClosingCtaSection";
import { LandingFooter } from "./landing/LandingFooter";

/**
 * Landing Page oficial do Tekidu — implementação do design aprovado no
 * Figma (ver "Update landing page design"). Composição, ordem e
 * elemento de assinatura (trajetória em linha/pontos) preservados
 * conforme o modelo; cores e Dark Mode reutilizam o sistema de tokens
 * já existente na plataforma (src/index.css + ThemeContext).
 */
export function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-paper font-sans">
      <LandingNavbar />
      <main className="flex-1">
        <HeroSection />
        <ProblemSection />
        <FlowSection />
        <EvolutionSection />
        <PersonasSection />
        <SecuritySection />
        <ClosingCtaSection />
      </main>
      <LandingFooter />
    </div>
  );
}
