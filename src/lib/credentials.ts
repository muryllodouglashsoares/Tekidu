/**
 * Geração de credenciais temporárias para o ciclo de vida de conta
 * estilo SUAP (Etapa 9). Usado por `userService.createTeacher` e
 * `studentService.createStudent` no momento do cadastro — o admin
 * NUNCA digita nem vê a senha/chave gerada aqui, ela só existe (a) no
 * Firebase Authentication e (b) no corpo do e-mail enviado (ver
 * `services/email/emailService.ts`).
 *
 * `crypto.getRandomValues` (Web Crypto API, disponível em todo
 * navegador moderno e no contexto de módulo do Vite) é usado em vez de
 * `Math.random()` porque isto é material de autenticação, ainda que
 * temporário — mesmo padrão de cuidado já seguido no projeto para
 * dados sensíveis.
 */

// Alfabeto sem caracteres ambíguos (sem 0/O, 1/I/l) — a chave de
// primeiro acesso do professor é digitada manualmente a partir do
// e-mail, então evitar ambiguidade visual reduz erro de digitação.
const LOGIN_KEY_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

// Alfabeto da senha temporária: mistura de tipos (minúsculas,
// maiúsculas, números, símbolo) para atender exigências mínimas de
// senha do Firebase Authentication e não parecer "fraca" ao usuário.
const PASSWORD_LOWER = "abcdefghijkmnpqrstuvwxyz";
const PASSWORD_UPPER = "ABCDEFGHJKMNPQRSTUVWXYZ";
const PASSWORD_DIGITS = "23456789";
const PASSWORD_SYMBOLS = "!@#$%&*";

function randomChar(alphabet: string): string {
  const bytes = new Uint32Array(1);
  crypto.getRandomValues(bytes);
  return alphabet[bytes[0] % alphabet.length];
}

function shuffle<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const bytes = new Uint32Array(1);
    crypto.getRandomValues(bytes);
    const j = bytes[0] % (i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Gera uma senha temporária de 10 caracteres, garantindo pelo menos um
 * caractere de cada tipo (minúscula, maiúscula, número, símbolo) para
 * satisfazer políticas de senha mais rígidas que o Firebase possa vir
 * a exigir, e para não parecer previsível.
 */
export function generateTempPassword(): string {
  const required = [
    randomChar(PASSWORD_LOWER),
    randomChar(PASSWORD_UPPER),
    randomChar(PASSWORD_DIGITS),
    randomChar(PASSWORD_SYMBOLS),
  ];
  const rest = Array.from({ length: 6 }, () =>
    randomChar(PASSWORD_LOWER + PASSWORD_UPPER + PASSWORD_DIGITS)
  );
  return shuffle([...required, ...rest]).join("");
}

/**
 * Gera a chave de primeiro acesso do professor (Decisão 1: opção "a"
 * — 8 caracteres alfanuméricos, sem caracteres ambíguos). Alunos NÃO
 * usam esta função: a matrícula (`Student.registrationNumber`) já
 * cumpre esse papel para eles (ver `studentService.createStudent`).
 */
export function generateLoginKey(): string {
  return Array.from({ length: 8 }, () => randomChar(LOGIN_KEY_ALPHABET)).join("");
}

/** Prazo de validade da credencial temporária (Decisão 3): 48 horas. */
export const TEMP_CREDENTIALS_TTL_MS = 48 * 60 * 60 * 1000;
