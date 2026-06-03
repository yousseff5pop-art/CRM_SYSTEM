import { createContext, useContext } from "react";

export const AuthContext = createContext({
  user: null,
  loading: true,
  refreshUser: async () => {},
  logout: async () => {}
});

export function useAuth() {
  return useContext(AuthContext);
}
