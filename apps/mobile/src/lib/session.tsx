import {
  createContext,
  useContext,
  useEffect,
  useState,
  PropsWithChildren,
} from "react";
import { api, User } from "./client";
import { storage } from "./storage";
type Session = {
  user: User | null;
  token: string | null;
  ready: boolean;
  accept: (value: { token: string; user: User }) => Promise<void>;
  update: (user: User) => void;
  logout: () => Promise<void>;
};
const Context = createContext<Session | null>(null);
export function SessionProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let active = true;
    storage
      .get()
      .then(async (saved) => {
        if (saved) {
          const me = await api<User>("/me", { token: saved });
          if (active) {
            setToken(saved);
            setUser(me);
          }
        }
      })
      .catch(() => storage.clear())
      .finally(() => {
        if (active) setReady(true);
      });
    return () => {
      active = false;
    };
  }, []);
  async function accept(value: { token: string; user: User }) {
    await storage.set(value.token);
    setToken(value.token);
    setUser(value.user);
  }
  async function logout() {
    if (token) await api("/auth/logout", { method: "POST", token });
    await storage.clear();
    setToken(null);
    setUser(null);
  }
  return (
    <Context.Provider
      value={{ user, token, ready, accept, update: setUser, logout }}
    >
      {children}
    </Context.Provider>
  );
}
export function useSession() {
  const value = useContext(Context);
  if (!value) throw new Error("Missing session provider");
  return value;
}
