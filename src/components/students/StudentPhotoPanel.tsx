import { useEffect, useRef, useState } from "react";
import { Camera, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { StudentAvatar } from "@/components/students/StudentAvatar";
import {
  removeStudentPhoto,
  STUDENT_PHOTO_ACCEPT,
  uploadStudentPhoto,
} from "@/services/students/studentPhotoService";
import type { Student } from "@/types/student";

interface StudentPhotoPanelProps {
  student: Student;
  /** true só quando o usuário logado é admin — único perfil com autoridade sobre a foto (ver firestore.rules/storage.rules, que reforçam isto de verdade). */
  canEdit: boolean;
  actor: { uid: string; name: string };
  /** Chamado após upload/remoção concluídos com sucesso, para o pai rebuscar o aluno atualizado. */
  onChanged: () => void;
}

/**
 * Painel "Foto" do Perfil 360° do aluno (fluxo pedido no briefing:
 * "Perfil do estudante → Foto → Alterar foto"). Fica embutido no
 * mesmo card de cabeçalho, junto do avatar — não é uma tela separada.
 *
 * Estudante e professor veem só a foto (`canEdit=false` → nenhum botão
 * de edição renderizado); a proteção REAL contra alteração por eles
 * está nas Security Rules, não aqui — esta checagem é só UX.
 */
export function StudentPhotoPanel({ student, canEdit, actor, onChanged }: StudentPhotoPanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmingRemove, setConfirmingRemove] = useState(false);

  // Libera o object URL de preview ao trocar de arquivo ou desmontar —
  // evita vazamento de memória (cada seleção cria uma nova blob URL).
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  function handleFileChosen(file: File | undefined) {
    if (!file) return;
    setError(null);
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  }

  function cancelSelection() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setSelectedFile(null);
    setPreviewUrl(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function confirmUpload() {
    if (!selectedFile) return;
    setUploading(true);
    setError(null);
    try {
      await uploadStudentPhoto(student.id, selectedFile, actor);
      cancelSelection();
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível enviar a foto. Tente novamente.");
    } finally {
      setUploading(false);
    }
  }

  async function handleRemove() {
    await removeStudentPhoto(student.id, student.photoURL !== null, actor);
    setConfirmingRemove(false);
    onChanged();
  }

  // Estado "selecionou um arquivo, aguardando confirmação" — pré-visualização.
  if (selectedFile && previewUrl) {
    return (
      <div className="flex items-center gap-4">
        <img
          src={previewUrl}
          alt="Pré-visualização da nova foto"
          className="h-14 w-14 shrink-0 rounded-full border-2 border-ink-200 object-cover"
        />
        <div className="min-w-0">
          <p className="text-sm font-medium text-ink900">Confirmar nova foto?</p>
          {error ? (
            <p role="alert" className="mt-0.5 text-xs text-danger">
              {error}
            </p>
          ) : (
            <p className="mt-0.5 truncate text-xs text-ink-400">{selectedFile.name}</p>
          )}
          <div className="mt-2 flex gap-2">
            <Button size="sm" loading={uploading} onClick={confirmUpload}>
              Confirmar
            </Button>
            <Button size="sm" variant="secondary" disabled={uploading} onClick={cancelSelection}>
              Cancelar
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-4">
      <div className="relative shrink-0">
        <StudentAvatar
          name={student.name}
          photoURL={student.photoURL}
          photoUpdatedAt={student.photoUpdatedAt}
          size="lg"
        />
        {canEdit && (
          <button
            type="button"
            aria-label={student.photoURL ? "Alterar foto" : "Adicionar foto"}
            title={student.photoURL ? "Alterar foto" : "Adicionar foto"}
            onClick={() => fileInputRef.current?.click()}
            className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full border-2 border-surface bg-ink-700 text-white shadow-sm hover:bg-ink-800"
          >
            <Camera className="h-3 w-3" />
          </button>
        )}
      </div>

      {canEdit && (
        <div className="flex flex-col gap-1.5">
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" onClick={() => fileInputRef.current?.click()}>
              {student.photoURL ? "Alterar foto" : "Adicionar foto"}
            </Button>
            {student.photoURL && (
              <Button
                size="sm"
                variant="ghost"
                className="!text-danger hover:!bg-danger/10"
                onClick={() => setConfirmingRemove(true)}
              >
                <X className="h-3.5 w-3.5" />
                Remover
              </Button>
            )}
          </div>
          <p className="text-xs text-ink-400">JPEG, PNG ou WebP · até 8MB</p>
          <input
            ref={fileInputRef}
            type="file"
            accept={STUDENT_PHOTO_ACCEPT}
            className="sr-only"
            onChange={(e) => handleFileChosen(e.target.files?.[0])}
          />
        </div>
      )}

      {confirmingRemove && (
        <ConfirmDialog
          title="Remover foto"
          description={`Tem certeza de que deseja remover a foto de perfil de ${student.name}? Esta ação não pode ser desfeita.`}
          confirmLabel="Remover"
          onCancel={() => setConfirmingRemove(false)}
          onConfirm={handleRemove}
        />
      )}
    </div>
  );
}
