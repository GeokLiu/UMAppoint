import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import {
  apiLogin,
  apiRegister,
  setAuth,
  clearAuth,
  getStoredUser,
  getToken,
  type StoredUser,
  type RegisterPayload,
} from "@/lib/backend";

export type Role = "student" | "lecturer";

export interface Me {
  id: string;
  email: string;
  full_name: string;
  phone: string | null;
  role: Role;
}

// ── Preview / demo mode mock users ───────────────────────────────────────────
const MOCK: Record<Role, Me> = {
  student: {
    id: "b0000000-0000-0000-0000-000000000001",
    email: "aiman.student@demo.umappoint.edu",
    full_name: "Muhammad Aiman bin Rosli",
    phone: null,
    role: "student",
  },
  lecturer: {
    id: "a0000000-0000-0000-0000-000000000001",
    email: "nurul.hakim@demo.umappoint.edu",
    full_name: "Nurul Hakimah binti Azman",
    phone: null,
    role: "lecturer",
  },
};

interface AuthCtx {
  me: Me | null;
  session: { user: { id: string; email: string } } | null;
  ready: boolean;
  /** True when using demo mock data (not real backend auth) */
  isPreview: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (data: RegisterPayload) => Promise<void>;
  signOut: () => void;
  /** Quick demo-mode switcher – does NOT call the backend */
  setPreviewRole: (r: Role) => void;
}

const Ctx = createContext<AuthCtx>({
  me: null,
  session: null,
  ready: false,
  isPreview: false,
  signIn: async () => {},
  signUp: async () => {},
  signOut: () => {},
  setPreviewRole: () => {},
});

function storedToMe(u: StoredUser): Me {
  return {
    id: u.user_id,
    email: u.email,
    full_name: u.full_name,
    phone: null,
    role: u.role as Role,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [me, setMe] = useState<Me | null>(null);
  const [ready, setReady] = useState(false);
  const [isPreview, setIsPreview] = useState(false);

  // ── Initialise from localStorage ─────────────────────────────────────────
  useEffect(() => {
    const token = getToken();
    if (token) {
      const stored = getStoredUser();
      if (stored) {
        setMe(storedToMe(stored));
        setIsPreview(false);
      } else {
        clearAuth();
        setMe(null);
      }
    } else {
      const r = localStorage.getItem("previewRole") as Role | null;
      if (r === "student" || r === "lecturer") {
        setMe(MOCK[r]);
        setIsPreview(true);
      } else {
        // Not logged in and not in preview mode
        setMe(null);
        setIsPreview(false);
      }
    }
    setReady(true);
  }, []);

  // ── Real auth actions ─────────────────────────────────────────────────────
  async function signIn(email: string, password: string) {
    const res = await apiLogin(email, password);
    const user: StoredUser = {
      user_id: res.user_id,
      role: res.role as Role,
      full_name: res.full_name,
      email: res.email,
    };
    setAuth(res.token, user);
    localStorage.removeItem("previewRole");
    setMe(storedToMe(user));
    setIsPreview(false);
  }

  async function signUp(data: RegisterPayload) {
    const res = await apiRegister(data);
    const user: StoredUser = {
      user_id: res.user_id,
      role: res.role as Role,
      full_name: res.full_name,
      email: res.email,
    };
    setAuth(res.token, user);
    localStorage.removeItem("previewRole");
    setMe(storedToMe(user));
    setIsPreview(false);
  }

  function signOut() {
    clearAuth();
    localStorage.removeItem("previewRole");
    setMe(null);
    setIsPreview(false);
  }

  // ── Demo preview ──────────────────────────────────────────────────────────
  function setPreviewRole(r: Role) {
    clearAuth();
    localStorage.setItem("previewRole", r);
    setMe(MOCK[r]);
    setIsPreview(true);
  }

  const session = me ? { user: { id: me.id, email: me.email } } : null;

  return (
    <Ctx.Provider
      value={{ me, session, ready, isPreview, signIn, signUp, signOut, setPreviewRole }}
    >
      {children}
    </Ctx.Provider>
  );
}

export const useAuth = () => useContext(Ctx);
