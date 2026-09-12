import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { getStudentsByGuardianUid } from "@/services/students/studentService";
import { describeFirebaseError } from "@/utils/firebaseError";
import type { Student } from "@/types/student";

/**
 * Resolve os alunos vinculados ao responsável logado — mesmo papel de
 * `useOwnStudent` (Portal do Aluno), mas para uma relação 1:N em vez
 * de 1:1 (Fase 2/3 do plano de evolução — Portal do Responsável).
 *
 * `children === undefined` enquanto carrega; `[]` quando o responsável
 * está com conta ativa mas ainda sem nenhum aluno vinculado (o admin
 * ainda não fez o vínculo em `students.guardianUids`) — o chamador
 * decide o que exibir em cada caso, mesmo contrato de `useOwnStudent`.
 */
export function useGuardianChildren(errorContext: string) {
  const { firebaseUser } = useAuth();
  const [children, setChildren] = useState<Student[] | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    if (!firebaseUser) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getStudentsByGuardianUid(firebaseUser.uid);
      setChildren(data);
    } catch (err) {
      setError(describeFirebaseError(err, errorContext));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firebaseUser?.uid]);

  return { children, loading, error, reload: load };
}
