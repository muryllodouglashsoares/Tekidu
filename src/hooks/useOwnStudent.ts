import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { getStudentByUid } from "@/services/students/studentService";
import { describeFirebaseError } from "@/utils/firebaseError";
import type { Student } from "@/types/student";

/**
 * Resolve o documento `students/{id}` do usuário logado a partir do
 * `uid` do Firebase Authentication — mesma resolução já usada em
 * `MyBoletimPage` (Tarefa 3, Fase 1 pós-auditoria V8), extraída para cá
 * porque o Portal do Aluno passou a ter mais de uma tela que precisa
 * dela (Meu Boletim, Minhas Disciplinas, Minha Frequência, Meu
 * Desempenho) — evita reescrever o mesmo `useEffect`/estado em cada
 * página nova (item 26 do plano multi-role: não duplicar lógica).
 *
 * `student === undefined` enquanto carrega, `null` quando o uid
 * autenticado não tem nenhum registro em `students` vinculado
 * (`uid` ausente/errado) — o chamador decide o que exibir em cada caso.
 */
export function useOwnStudent(errorContext: string) {
  const { firebaseUser } = useAuth();
  const [student, setStudent] = useState<Student | null | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    if (!firebaseUser) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getStudentByUid(firebaseUser.uid);
      setStudent(data);
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

  return { student, loading, error, reload: load };
}
