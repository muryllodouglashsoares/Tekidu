import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  type User as FirebaseUser,
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import type { UserProfile } from "@/types/user";

interface AuthContextValue {
  /** Objeto cru do Firebase Authentication (contém o UID). */
  firebaseUser: FirebaseUser | null;
  /** Documento users/{uid} do Firestore (contém a role). */
  profile: UserProfile | null;
  /** true enquanto ainda não sabemos se há sessão ativa. */
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // onAuthStateChanged é o único listener "verdadeiro" de sessão do
    // Firebase: ele dispara no carregamento inicial da página (restaurando
    // a sessão persistida) e sempre que login/logout acontece.
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);

      if (user) {
        // O UID do Firebase Authentication é usado como o próprio ID do
        // documento em "users", então a busca do perfil é direta e não
        // exige nenhuma query — apenas leitura por ID.
        const snapshot = await getDoc(doc(db, "users", user.uid));

        if (snapshot.exists()) {
          setProfile(snapshot.data() as UserProfile);
        } else {
          // Autenticado no Firebase Auth, mas sem documento em Firestore.
          // Isso é um estado inconsistente (ver seção "Authentication +
          // Firestore" da explicação) — tratamos como perfil ausente em
          // vez de travar a aplicação.
          setProfile(null);
        }
      } else {
        setProfile(null);
      }

      setLoading(false);
    });

    return unsubscribe;
  }, []);

  async function signIn(email: string, password: string) {
    await signInWithEmailAndPassword(auth, email, password);
    // Não precisamos setar estado aqui: onAuthStateChanged dispara
    // automaticamente após o login e atualiza firebaseUser + profile.
  }

  async function signOut() {
    await firebaseSignOut(auth);
  }

  async function resetPassword(email: string) {
    await sendPasswordResetEmail(auth, email);
  }

  return (
    <AuthContext.Provider
      value={{ firebaseUser, profile, loading, signIn, signOut, resetPassword }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth precisa estar dentro de <AuthProvider>");
  return ctx;
}
