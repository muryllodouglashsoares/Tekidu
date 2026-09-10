import type { ReactNode } from "react";
import { PersonStanding, RotateCcw, Type } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { useAccessibility, type FontScale } from "@/contexts/AccessibilityContext";

const FONT_SCALE_OPTIONS: { value: FontScale; label: string }[] = [
  { value: 100, label: "100%" },
  { value: 110, label: "110%" },
  { value: 125, label: "125%" },
  { value: 150, label: "150%" },
];

/** Switch acessível (`role="switch"`) — reutilizado por todas as
 * opções do painel em vez de cada uma desenhar seu próprio toggle. */
function AccessibilitySwitch({
  id,
  label,
  description,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  description: string;
  checked: boolean;
  onChange: () => void;
}) {
  const labelId = `${id}-label`;
  const descriptionId = `${id}-description`;
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div className="min-w-0">
        {/* `<label htmlFor>` não associa nome acessível a um `<button>`
            (funciona só com controles de formulário nativos) — por
            isso o botão usa `aria-labelledby`/`aria-describedby`
            apontando para este texto, em vez de depender do `label`. */}
        <span id={labelId} className="block text-sm font-semibold text-ink900">
          {label}
        </span>
        <p id={descriptionId} className="mt-0.5 text-xs text-ink-500">
          {description}
        </p>
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-labelledby={labelId}
        aria-describedby={descriptionId}
        onClick={onChange}
        className={`relative h-7 w-12 shrink-0 rounded-full border transition-colors ${
          checked ? "border-ink-700 bg-ink-700" : "border-line bg-ink-100"
        }`}
      >
        <span
          aria-hidden="true"
          className={`absolute top-0.5 h-5.5 w-5.5 rounded-full bg-white shadow-sm transition-transform ${
            checked ? "translate-x-5.5" : "translate-x-0.5"
          }`}
          style={{ height: "1.375rem", width: "1.375rem" }}
        />
      </button>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="border-t border-line pt-4 first:border-t-0 first:pt-0">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-400">{title}</h3>
      <div className="divide-y divide-line">{children}</div>
    </section>
  );
}

interface AccessibilityPanelProps {
  onClose: () => void;
}

/**
 * Central de Acessibilidade (item 3 do briefing) — painel global que
 * concentra as preferências controladas por `AccessibilityContext`.
 * Construído sobre o `Modal` compartilhado (em vez de um componente
 * novo isolado) para herdar automaticamente o mesmo comportamento de
 * diálogo acessível (foco preso, `Esc` fecha, restaura foco ao
 * fechar) usado pelo restante do app — ver item 28 do briefing.
 */
export function AccessibilityPanel({ onClose }: AccessibilityPanelProps) {
  const {
    fontScale,
    highContrast,
    reducedMotion,
    readingMode,
    highlightLinks,
    increasedSpacing,
    setFontScale,
    toggleHighContrast,
    toggleReducedMotion,
    toggleReadingMode,
    toggleHighlightLinks,
    toggleIncreasedSpacing,
    resetSettings,
  } = useAccessibility();

  return (
    <Modal title="Acessibilidade" onClose={onClose} size="lg" mobileBehavior="fullscreen">
      <div className="flex flex-col gap-4">
        <Section title="Aparência">
          <div className="py-3">
            <div className="mb-2 flex items-center gap-2">
              <Type className="h-4 w-4 text-ink-500" aria-hidden="true" />
              <span id="font-scale-label" className="text-sm font-semibold text-ink900">
                Tamanho do texto
              </span>
            </div>
            <div
              role="radiogroup"
              aria-labelledby="font-scale-label"
              className="grid grid-cols-4 gap-2"
            >
              {FONT_SCALE_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  role="radio"
                  aria-checked={fontScale === option.value}
                  onClick={() => setFontScale(option.value)}
                  className={`rounded-full border px-2 py-2 text-xs font-semibold transition-colors ${
                    fontScale === option.value
                      ? "border-ink-700 bg-ink-700 text-white"
                      : "border-line bg-surface text-ink-600 hover:bg-ink-50"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
          <AccessibilitySwitch
            id="a11y-high-contrast"
            label="Alto contraste"
            description="Aumenta a distinção entre texto, fundo, bordas e estados."
            checked={highContrast}
            onChange={toggleHighContrast}
          />
          <AccessibilitySwitch
            id="a11y-highlight-links"
            label="Destacar links"
            description="Sublinha links para distingui-los sem depender só da cor."
            checked={highlightLinks}
            onChange={toggleHighlightLinks}
          />
        </Section>

        <Section title="Movimento">
          <AccessibilitySwitch
            id="a11y-reduced-motion"
            label="Reduzir animações"
            description="Remove transições e movimentos não essenciais da interface."
            checked={reducedMotion}
            onChange={toggleReducedMotion}
          />
        </Section>

        <Section title="Leitura">
          <AccessibilitySwitch
            id="a11y-reading-mode"
            label="Modo de leitura"
            description="Aumenta o espaçamento de texto e reduz elementos decorativos."
            checked={readingMode}
            onChange={toggleReadingMode}
          />
          <AccessibilitySwitch
            id="a11y-increased-spacing"
            label="Espaçamento aumentado"
            description="Aumenta o espaço entre linhas de parágrafos, listas e rótulos."
            checked={increasedSpacing}
            onChange={toggleIncreasedSpacing}
          />
        </Section>

        <div className="flex items-center justify-between gap-3 border-t border-line pt-4">
          <p className="flex items-center gap-2 text-xs text-ink-400">
            <PersonStanding className="h-4 w-4 shrink-0" aria-hidden="true" />
            As preferências ficam salvas neste dispositivo.
          </p>
          <Button type="button" variant="ghost" size="sm" onClick={resetSettings}>
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
            Restaurar padrões
          </Button>
        </div>
      </div>
    </Modal>
  );
}
