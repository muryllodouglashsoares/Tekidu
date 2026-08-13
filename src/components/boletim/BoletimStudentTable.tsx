import { FileText } from "lucide-react";
import { StudentStatusBadge } from "@/components/students/StudentStatusBadge";
import type { Student } from "@/types/student";

interface BoletimStudentTableProps {
  students: Student[];
  onSelectStudent: (student: Student) => void;
}

/**
 * Tabela de alunos de uma turma (item 8 do briefing). Nome, matrícula e
 * situação vêm direto de `Student` — sem dados inventados. Clicar na
 * linha ou no botão "Ver boletim" abre o boletim daquele aluno.
 */
export function BoletimStudentTable({ students, onSelectStudent }: BoletimStudentTableProps) {
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
