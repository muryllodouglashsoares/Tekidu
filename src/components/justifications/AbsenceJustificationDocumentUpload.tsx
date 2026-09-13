import { useId, useRef, useState } from "react";
import { FileText, Image as ImageIcon, Upload, X } from "lucide-react";
import {
  ACCEPTED_DOCUMENT_INPUT_ACCEPT,
  formatFileSize,
  validateJustificationDocument,
} from "@/services/justifications/absenceJustificationDocumentService";
import { MAX_DOCUMENT_SIZE_BYTES } from "@/types/absenceJustification";

interface AbsenceJustificationDocumentUploadProps {
  file: File | null;
  onChange: (file: File | null) => void;
  disabled?: boolean;
  error?: string | null;
}

/**
 * Área de upload do documento comprobatório (seção 9/10 do prompt).
 * Aceita apenas UM arquivo por vez (primeira versão — seção 9: "não
 * permitir múltiplos arquivos, salvo se a arquitetura justificar").
 * Valida formato/tamanho no momento da seleção (`validateJustificationDocument`,
 * reaproveitada também pelo upload real — nunca confiar só nesta
 * checagem de UI, a Storage Rule repete a mesma validação no servidor).
 */
export function AbsenceJustificationDocumentUpload({
  file,
  onChange,
  disabled,
  error,
}: AbsenceJustificationDocumentUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const inputId = useId();
  const shownError = error ?? localError;

  function handleFiles(fileList: FileList | null) {
    const selected = fileList?.[0];
    if (!selected) return;
    const validationError = validateJustificationDocument(selected);
    if (validationError) {
      setLocalError(validationError);
      onChange(null);
      return;
    }
    setLocalError(null);
    onChange(selected);
  }

  function handleRemove() {
    setLocalError(null);
    onChange(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={inputId} className="text-sm font-medium text-ink-700">
        Documento comprobatório
        <span aria-hidden="true" className="ml-0.5 text-danger">
          *
        </span>
      </label>

      {!file ? (
        <label
          htmlFor={inputId}
          className={`flex cursor-pointer flex-col items-center gap-2 rounded-card border border-dashed px-4 py-6 text-center transition-colors
            ${shownError ? "border-danger" : "border-line hover:border-ink-400"}
            ${disabled ? "pointer-events-none opacity-50" : ""}`}
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-card bg-ink-50 text-ink-400">
            <Upload className="h-5 w-5" aria-hidden="true" />
          </span>
          <span className="text-sm font-medium text-ink-700">
            Toque para enviar um arquivo
          </span>
          <span className="text-xs text-ink-500">
            JPG, PNG, WEBP ou PDF · até {formatFileSize(MAX_DOCUMENT_SIZE_BYTES)}
          </span>
          <span className="text-xs text-ink-400">Fotos maiores são compactadas automaticamente</span>
          <input
            ref={inputRef}
            id={inputId}
            type="file"
            accept={ACCEPTED_DOCUMENT_INPUT_ACCEPT}
            disabled={disabled}
            aria-invalid={!!shownError}
            aria-describedby={shownError ? `${inputId}-error` : undefined}
            className="sr-only"
            onChange={(e) => handleFiles(e.target.files)}
          />
        </label>
      ) : (
        <div className="flex items-center gap-3 rounded-card border border-line bg-surface px-3.5 py-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-card bg-ink-50 text-ink-500">
            {file.type === "application/pdf" ? (
              <FileText className="h-4 w-4" aria-hidden="true" />
            ) : (
              <ImageIcon className="h-4 w-4" aria-hidden="true" />
            )}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-ink900">{file.name}</p>
            <p className="text-xs text-ink-500">{formatFileSize(file.size)}</p>
          </div>
          <button
            type="button"
            aria-label="Remover arquivo selecionado"
            disabled={disabled}
            onClick={handleRemove}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-card text-ink-400 hover:bg-ink-50 hover:text-ink-700 disabled:opacity-50"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      )}

      {shownError && (
        <span id={`${inputId}-error`} role="alert" className="text-xs text-danger">
          {shownError}
        </span>
      )}
    </div>
  );
}
