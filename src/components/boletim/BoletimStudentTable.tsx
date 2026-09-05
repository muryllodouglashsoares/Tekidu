import { FileText } from "lucide-react";
import { StudentStatusBadge } from "@/components/students/StudentStatusBadge";
import type { Student } from "@/types/student";
import { useIsMobile } from "@/hooks/useMediaQuery";
import { MobileDataCard } from "@/components/mobile/MobileDataCard";

interface BoletimStudentTableProps {
  students: Student[];
  onSelectStudent: (student: Student) => void;
}

/**
 * Tabela de alunos de uma turma (item 8 do briefing). Nome, matrícula e
 * situação vêm direto de `Student` — sem dados inventados. Clicar na
 * linha ou no botão "Ver boletim" abre o boletim daquele aluno. Em
 * mobile vira cards (ver "MOBILE DATA CARDS" no briefing).
 */
export function BoletimStudentTable({ students, onSelectStudent }: BoletimStudentTableProps) {
  const isMobile = useIsMobile();

  function initials(name: string) {
    return name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join("");
  }

  if (isMobile) {
    return (
      <div className="flex flex-col gap-2.5 p-3">
        {students.map((student) => (
          <MobileDataCard
            key={student.id}
            onClick={() => onSelectStudent(student)}
            leading={
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-ink-100 text-xs font-semibold text-ink-700">
                {initials(student.name)}
              </span>
            }
            title={student.name}
            subtitle={student.registrationNumber || "Sem matrícula"}
            meta={<StudentStatusBadge status={student.status} />}
            actions={
              <span className="flex h-9 w-9 items-center justify-center rounded-card text-ink-400">
                <FileText className="h-4 w-4" />
              </span>
            }
          />
        ))}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-line text-xs uppercase tracking-wide text-ink-400">
            <th className="px-4 py-3 font-medium">Aluno</th>
            <th className="px-4 py-3 font-medium">Matrícula</th>
            <th className="px-4 py-3 font-medium">Situação</th>
            <th className="px-4 py-3 font-medium" />
          </tr>
        </thead>
        <tbody>
          {students.map((student) => (
            <tr
              key={student.id}
              onClick={() => onSelectStudent(student)}
              className="cursor-pointer border-b border-line last:border-0 hover:bg-ink-50"
            >
              <td className="px-4 py-3 font-medium text-ink900">{student.name}</td>
              <td className="px-4 py-3 tabular text-ink-600">{student.registrationNumber || "—"}</td>
              <td className="px-4 py-3">
                <StudentStatusBadge status={student.status} />
              </td>
              <td className="px-4 py-3">
                <div className="flex justify-end">
                  <button
                    type="button"
                    aria-label={`Ver boletim de ${student.name}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectStudent(student);
                    }}
                    className="inline-flex items-center gap-1.5 rounded-card px-2.5 py-1.5 text-ink-500 hover:bg-ink-100 hover:text-ink-800"
                  >
                    <FileText className="h-4 w-4" aria-hidden="true" />
                    Ver boletim
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
