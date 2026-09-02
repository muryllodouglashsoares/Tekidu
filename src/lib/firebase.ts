import { deleteApp, initializeApp } from "firebase/app";
import {
  browserLocalPersistence,
  createUserWithEmailAndPassword,
  getAuth,
  setPersistence,
  signOut as signOutSecondaryAuth,
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";

/**
 * Todas as chaves abaixo são PÚBLICAS por natureza — o Firebase foi
 * desenhado para que a "apiKey" do Web SDK circule no bundle do
 * frontend. Isso NÃO é uma falha de segurança: quem protege os dados
 * são as Firestore/Storage Security Rules, nunca o sigilo dessas chaves.
 *
 * As variáveis são injetadas em build-time pelo Vite a partir do
 * arquivo .env.local (que não deve ser commitado — veja .gitignore).
 */
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Falha cedo e de forma clara caso o .env.local não tenha sido preenchido.
if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
  throw new Error(
    "Configuração do Firebase ausente. Copie .env.example para .env.local " +
      "e preencha os valores encontrados em: Firebase Console → Configurações " +
      "do projeto → Geral → Seus apps → app Web."
  );
}

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Persistência explícita em localStorage: a sessão sobrevive ao fechar
// a aba/navegador. É o comportamento padrão do SDK, mas deixamos
// explícito para que a decisão fique documentada no código.
setPersistence(auth, browserLocalPersistence);

/**
 * Cria uma conta no Firebase Authentication (e-mail/senha) SEM afetar a
 * sessão atualmente logada (ex.: um admin cadastrando um professor).
 *
 * PROBLEMA QUE ISSO RESOLVE:
 * `createUserWithEmailAndPassword` do SDK do cliente autentica
 * automaticamente como o usuário recém-criado — se chamado no `auth`
 * principal, isso derrubaria a sessão do admin que está cadastrando o
 * professor. Não existe forma de criar apenas o registro de
 * Authentication sem logar como ele usando o SDK do cliente.
 *
 * SOLUÇÃO: um segundo App do Firebase (mesmo projeto, mesma config),
 * com sua própria instância de Auth isolada. Criamos a conta ali,
 * fazemos logout imediatamente NESSA instância secundária (que nunca
 * chega a persistir em localStorage antes do signOut) e destruímos o
 * App em seguida. A sessão do admin no `auth` principal nunca é tocada.
 *
 * LIMITAÇÃO: isso só cria a conta de Authentication. Não é possível,
 * pelo SDK do cliente, definir custom claims ou administrar a conta
 * (ex.: excluir, forçar troca de senha) sem um backend com Admin SDK
 * (Cloud Function). Por isso a "exclusão" de um professor nesta fase é
 * uma desativação lógica (`active: false` no Firestore), não a remoção
 * da conta de Authentication — ver `userService.ts`.
 */
export async function createStaffAuthAccount(
  email: string,
  password: string
): Promise<string> {
  const secondaryApp = initializeApp(firebaseConfig, `secondary-${Date.now()}`);
  const secondaryAuth = getAuth(secondaryApp);
  try {
    const credential = await createUserWithEmailAndPassword(secondaryAuth, email, password);
    const uid = credential.user.uid;
    await signOutSecondaryAuth(secondaryAuth);
    return uid;
  } finally {
    await deleteApp(secondaryApp);
  }
}
