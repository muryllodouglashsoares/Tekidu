import { useCallback, useRef, useState } from "react";
import { getStudents } from "@/services/students/studentService";
import { getAllTeachers } from "@/services/users/userService";
import { getClasses } from "@/services/classes/classService";
import { getDisciplines } from "@/services/disciplines/disciplineService";
import type { Student } from "@/types/student";
import type { UserProfile } from "@/types/user";
import type { SchoolClass } from "@/types/schoolClass";
import type { Discipline } from "@/types/discipline";
import { describeFirebaseError } from "@/utils/firebaseError";

export interface CommandPaletteData {
  students: Student[];
  teachers: UserProfile[];
  classes: SchoolClass[];
  disciplines: Discipline[];
}

const EMPTY_DATA: CommandPaletteData = {
  students: [],
  teachers: [],
  classes: [],
  disciplines: [],
};

/**
 * Carrega, sob demanda (apenas quando a Command Palette é aberta pela
 * primeira vez), os dados que a busca por entidades precisa. Reaproveita
 * integralmente os services já existentes (mesma fonte de dados real do
 * Firebase usada pelas páginas de Alunos/Professores/Turmas/
 * Disciplinas) em vez de duplicar acesso ao Firestore ou usar mocks.
 *
 * Cada tipo de entidade só é buscado se o perfil atual tem permissão
 * para aquela tela (mesmas regras de `AppRoutes`/`Sidebar`), então um
 * aluno nunca dispara uma consulta que a Security Rule negaria de
 * qualquer forma.
 */
export function useCommandPaletteData(role: "admin" | "teacher" | "student" | undefined) {
  const [data, setData] = useState<CommandPaletteData>(EMPTY_DATA);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const loadedOnce = useRef(false);

  const canSeeStudentsClassesDisciplines = role === "admin" || role === "teacher";
  const canSeeTeachers = role === "admin";

  const ensureLoaded = useCallback(async () => {
    if (loadedOnce.current) return;
    if (!canSeeStudentsClassesDisciplines && !canSeeTeachers) {
      // Aluno: nada a pré-carregar, a busca fica restrita a
      // páginas/ações (ver CommandPalette.tsx).
      loadedOnce.current = true;
      setStatus("ready");
      return;
    }

    loadedOnce.current = true;
    setStatus("loading");
    setError(null);
    try {
      const results = await Promise.all([
        canSeeStudentsClassesDisciplines ? getStudents() : Promise.resolve([]),
        canSeeTeachers ? getAllTeachers() : Promise.resolve([]),
        canSeeStudentsClassesDisciplines ? getClasses() : Promise.resolve([]),
        canSeeStudentsClassesDisciplines ? getDisciplines() : Promise.resolve([]),
      ]);
      setData({
        students: results[0] as Student[],
        teachers: results[1] as UserProfile[],
        classes: results[2] as SchoolClass[],
        disciplines: results[3] as Discipline[],
      });
      setStatus("ready");
    } catch (err) {
      setError(describeFirebaseError(err, "command-palette:carregar"));
      setStatus("error");
      // Permite tentar novamente na próxima abertura em vez de ficar
      // preso num estado de erro permanente.
      loadedOnce.current = false;
    }
  }, [canSeeStudentsClassesDisciplines, canSeeTeachers]);

  return { data, status, error, ensureLoaded };
}
