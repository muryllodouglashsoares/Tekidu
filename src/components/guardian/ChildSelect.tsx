import { Select } from "@/components/ui/Select";
import type { Student } from "@/types/student";

/**
 * Seletor "qual filho" — reaproveitado por `GuardianBoletimPage` e
 * `GuardianAttendancePage` (Fase 3 do plano de evolução — Portal do
 * Responsável). Extraído para não duplicar a mesma marcação de
 * `<Select>` + `<option>` nas duas telas; a lógica de QUAL filho está
 * selecionado por padrão continua em cada página (a primeira, ao
 * carregar), não aqui.
 */
export function ChildSelect({
  childrenList,
  selectedId,
  onChange,
}: {
  childrenList: Student[];
  selectedId: string;
  onChange: (studentId: string) => void;
}) {
  if (childrenList.length <= 1) return null;

  return (
    <div className="w-full sm:w-64">
      <Select label="Filho(a)" value={selectedId} onChange={(e) => onChange(e.target.value)}>
        {childrenList.map((child) => (
          <option key={child.id} value={child.id}>
            {child.name}
          </option>
        ))}
      </Select>
    </div>
  );
}
