/**
 * Feedback háptico (seção "HAPTIC FEEDBACK" do briefing mobile): o
 * briefing pede explicitamente para NÃO usar APIs experimentais nem
 * dependências novas, só deixar a arquitetura pronta para o futuro.
 *
 * `navigator.vibrate` é a Vibration API padrão do W3C (não
 * experimental, sem instalação) — mas seu suporte é parcial (Android
 * Chrome/Firefox; ausente no Safari/iOS) e alguns navegadores exigem
 * interação do usuário/permissão. Por isso este hook nunca lança erro
 * nem quebra a ação que o chamou: se a API não existir ou falhar, é
 * um no-op silencioso. Pulsos são propositalmente curtos (ver
 * "Não simule vibração excessivamente" no briefing) e reservados para
 * confirmações de ações importantes — marcar presença, salvar uma
 * nota, excluir um registro — nunca para toques comuns de navegação.
 */
export type HapticPattern = "light" | "success" | "warning";

const PATTERN_MS: Record<HapticPattern, number | number[]> = {
  light: 8,
  success: 12,
  warning: [12, 40, 12],
};

export function useHapticFeedback() {
  function trigger(pattern: HapticPattern = "light") {
    try {
      if (typeof navigator === "undefined" || typeof navigator.vibrate !== "function") return;
      navigator.vibrate(PATTERN_MS[pattern]);
    } catch {
      // Ambiente sem suporte (ex.: iOS Safari) — segue sem vibrar.
    }
  }

  return { trigger };
}
