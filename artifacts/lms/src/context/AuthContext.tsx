import React, { createContext, useContext, useState, useEffect } from "react";
import { useGetMe, User, setUnauthorizedHandler } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  setUser: (user: User | null) => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  setUser: () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isInit, setIsInit] = useState(false);
  const qc = useQueryClient();

  const { data: me, isLoading, isError } = useGetMe({
    query: {
      retry: false,
    } as any
  });

  useEffect(() => {
    if (!isLoading) {
      if (me && !isError) {
        setUser(me);
      } else {
        setUser(null);
      }
      setIsInit(true);
    }
  }, [me, isLoading, isError]);

  // When the API responds with 401 (e.g. session expired server-side),
  // clear local auth state and bounce the user to the login page so they
  // don't get stuck staring at a UI whose actions silently fail.
  useEffect(() => {
    setUnauthorizedHandler(() => {
      setUser(null);
      qc.clear();
      if (typeof window !== "undefined" && window.location.pathname !== "/login") {
        window.location.assign("/login");
      }
    });
    return () => setUnauthorizedHandler(null);
  }, [qc]);

  return (
    <AuthContext.Provider value={{ user, isLoading: !isInit, setUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
