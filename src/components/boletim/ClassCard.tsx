import { ArrowRight, Users } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ClassShiftBadge } from "@/components/classes/ClassShiftBadge";
import type { SchoolClass } from "@/types/schoolClass";

interface ClassCardProps {
  schoolClass: SchoolClass;
  studentCount: number;
  onSelect: () => void;
}

/**
 * Card de turma exibido na tela inicial de Boletins (item 6 do
 * briefing). Mesmas informações já disponíveis no modelo real de
 * `SchoolClass`/`students` (nada inventado): nome, série, ano letivo,
 * turno e quantidade de alunos vinculados.
 */
export function ClassCard({ schoolClass, studentCount, onSelect }: ClassCardProps) {
  return (
    <Card className="flex flex-col gap-4 p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-display text-base font-semibold text-ink900">{schoolClass.name}</p>
          <p className="text-sm text-ink-500">{schoolClass.grade}</p>
        </div>
        <ClassShiftBadge shift={schoolClass.shift} />
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ink-600">
        <span>Ano letivo: {schoolClass.schoolYear}</span>
        <span className="inline-flex items-center gap-1.5">
          <Users className="h-3.5 w-3.5 text-ink-400" aria-hidden="true" />
          {studentCount} aluno{studentCount === 1 ? "" : "s"}
        </span>
      </div>

      <Button variant="secondary" onClick={onSelect} className="mt-1 w-full justify-center">
        Visualizar alunos
        <ArrowRight className="h-4 w-4" />
      </Button>
    </Card>
  );
}
