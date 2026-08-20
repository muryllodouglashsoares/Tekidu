import { useEffect, useRef } from "react";

interface RowCheckboxProps {
  checked: boolean;
  indeterminate?: boolean;
  onChange: () => void;
  label: string;
}

/**
 * Checkbox de seleção reaproveitado tanto nas linhas quanto no
 * cabeçalho ("selecionar tudo"). O estado `indeterminate` (parte da
 * página selecionada) só existe via propriedade do DOM, não via
 * atributo HTML — por isso o `useRef` + `useEffect` aqui.
 */
export function RowCheckbox({ checked, indeterminate = false, onChange, label }: RowCheckboxProps) {
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate;
  }, [indeterminate]);

  return (
    <input
      ref={ref}
      type="checkbox"
      aria-label={label}
      checked={checked}
      onChange={onChange}
      onClick={(e) => e.stopPropagation()}
      className="h-4 w-4 cursor-pointer rounded border-line text-ink-700 accent-ink-700"
    />
  );
}
