import { useEffect, useState } from "react";

interface StudentAvatarProps {
  name: string;
  photoURL: string | null;
  /** Timestamp bruto do Firestore (ou já convertido) usado só para cache-busting — ver `types/student.ts`. */
  photoUpdatedAt?: unknown;
  /** "sm" (listagens, 32px), "md" (não usado ainda, reservado) ou "lg" (cabeçalho do Perfil 360°, 56px). */
  size?: "sm" | "md" | "lg";
  className?: string;
}

const SIZE_CLASS: Record<NonNullable<StudentAvatarProps["size"]>, string> = {
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-14 w-14 text-lg",
};

function initialsOf(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

/**
 * Avatar de aluno: mostra a foto de perfil OFICIAL quando existe
 * (`photoURL`), com fallback para as iniciais do nome — o mesmo
 * círculo `bg-ink-100` já usado em `StudentsPage`/`StudentProfilePage`
 * antes deste recurso, agora centralizado aqui para não duplicar o
 * padrão em cada lugar que precisa identificar um aluno visualmente.
 *
 * Trata imagem quebrada (`onError`) caindo de volta para as iniciais
 * em vez de deixar o ícone de imagem quebrada do navegador aparecer —
 * ver briefing, "Não deixe imagens quebradas... aparecendo na
 * interface".
 */
export function StudentAvatar({
  name,
  photoURL,
  photoUpdatedAt,
  size = "sm",
  className = "",
}: StudentAvatarProps) {
  const [broken, setBroken] = useState(false);

  // Se a foto for trocada (nova URL) enquanto o mesmo componente segue
  // montado (ex.: painel de foto no Perfil 360° após o admin trocar a
  // imagem), uma falha de carregamento anterior não deve "grudar" na
  // nova URL.
  useEffect(() => {
    setBroken(false);
  }, [photoURL]);

  const cacheBustedURL =
    photoURL && photoUpdatedAt
      ? `${photoURL}${photoURL.includes("?") ? "&" : "?"}v=${toMillis(photoUpdatedAt)}`
      : photoURL;

  if (cacheBustedURL && !broken) {
    return (
      <img
        src={cacheBustedURL}
        alt={`Foto de ${name}`}
        loading="lazy"
        onError={() => setBroken(true)}
        className={`shrink-0 rounded-full object-cover ${SIZE_CLASS[size]} ${className}`}
      />
    );
  }

  return (
    <span
      aria-hidden="true"
      className={`flex shrink-0 items-center justify-center rounded-full bg-ink-100 font-semibold text-ink-700 ${SIZE_CLASS[size]} ${className}`}
    >
      {initialsOf(name) || "?"}
    </span>
  );
}

function toMillis(value: unknown): number {
  if (value && typeof value === "object" && "toMillis" in value) {
    try {
      return (value as { toMillis: () => number }).toMillis();
    } catch {
      return 0;
    }
  }
  return 0;
}
