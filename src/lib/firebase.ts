import { initializeApp } from "firebase/app";
import { getAuth, browserLocalPersistence, setPersistence } from "firebase/auth";
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
