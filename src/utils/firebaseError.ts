import { FirebaseError } from "firebase/app";

/**
 * Traduz um erro do Firebase/Firestore em uma mensagem segura para o
 * usuário final, sem expor detalhes técnicos (nome de collection,
 * regra de segurança, etc.), e SEMPRE loga o erro técnico original no
 * console (`console.error`) para diagnóstico em desenvolvimento.
 *
 * PROBLEMA QUE ISSO RESOLVE:
 * Antes, todos os `catch` de carregamento de dados (Notas, Frequência,
 * etc.) capturavam qualquer erro e mostravam sempre a mesma mensagem
 * genérica ("Não foi possível carregar..."), descartando o erro
 * original. Isso tornava impossível diferenciar, por exemplo, um
 * índice composto ausente no Firestore (`failed-precondition`) de uma
 * negação de permissão (`permission-denied`) ou de uma simples queda
 * de rede — os três apareciam da mesma forma para quem estava
 * depurando o problema.
 *
 * `context` é um rótulo curto (ex.: "notas", "avaliações", "frequência")
 * usado apenas no log técnico, para localizar rapidamente qual chamada
 * falhou quando várias rodam em paralelo (`Promise.all`).
 */
export function describeFirebaseError(error: unknown, context: string): string {
  if (error instanceof FirebaseError) {
    // eslint-disable-next-line no-console
    console.error(`[Firebase] Falha em "${context}" — code=${error.code}`, error);

    switch (error.code) {
      case "permission-denied":
        return "Você não tem permissão para acessar estes dados. Verifique se sua conta está ativa e com o perfil correto.";
      case "unauthenticated":
        return "Sua sessão expirou. Faça login novamente para continuar.";
      case "failed-precondition":
        // Sintoma mais comum: consulta com múltiplos `where` + `orderBy`
        // sem o índice composto correspondente criado no Firestore. O
        // próprio SDK inclui um link para criar o índice na mensagem
        // original (visível no console), por isso preservamos `error`
        // no `console.error` acima em vez de resumir aqui.
        return "Não foi possível carregar os dados: uma configuração do banco de dados (índice) ainda precisa ser criada. Contate o administrador do sistema.";
      case "unavailable":
      case "deadline-exceeded":
        return "Não foi possível conectar ao servidor. Verifique sua internet e tente novamente.";
      case "not-found":
        return "Um dos registros relacionados não foi encontrado. Ele pode ter sido removido.";
      default:
        return "Não foi possível carregar os dados. Tente novamente em instantes.";
    }
  }

  // eslint-disable-next-line no-console
  console.error(`[Erro inesperado] em "${context}"`, error);
  return "Ocorreu um erro inesperado. Tente novamente.";
}
