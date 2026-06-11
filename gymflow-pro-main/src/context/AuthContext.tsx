import React, { createContext, useContext, useEffect, useState } from "react";
import { OwnerProfile, getOwnerProfile, getTokens, setOwnerProfile, clearAuth, getActiveGymId, setActiveGymId } from "@/lib/auth";

interface AuthContextType {
  owner: OwnerProfile | null;
  isAuthenticated: boolean;
  activeGymId: string | null;
  login: (profile: OwnerProfile) => void;
  logout: () => void;
  setGymId: (gymId: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [owner, setOwner] = useState<OwnerProfile | null>(null);
  const [activeGymId, setActiveGymIdState] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Load state from localStorage on mount
    const tokens = getTokens();
    const storedOwner = getOwnerProfile();
    const storedGymId = getActiveGymId();

    if (tokens && storedOwner) {
      setOwner(storedOwner);
      if (storedGymId) {
        setActiveGymIdState(storedGymId);
      }
    }
    setIsReady(true);
  }, []);

  const login = (profile: OwnerProfile) => {
    setOwner(profile);
    setOwnerProfile(profile);
  };

  const logout = () => {
    clearAuth();
    setOwner(null);
    setActiveGymIdState(null);
  };

  const setGymId = (gymId: string) => {
    setActiveGymIdState(gymId);
    setActiveGymId(gymId);
  };

  if (!isReady) {
    return null; // Or a full-screen loading spinner
  }

  return (
    <AuthContext.Provider
      value={{
        owner,
        isAuthenticated: !!owner,
        activeGymId,
        login,
        logout,
        setGymId,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
