import React, { createContext, useContext, useEffect, useState } from "react";
import { apiClient } from "../lib/api/client";

interface Member {
  _id: string;
  name: string;
  email: string;
  phone: string;
  gymId: string;
  memberId: string;
}

interface AuthContextType {
  member: Member | null;
  loading: boolean;
  login: (token: string, refreshToken: string, memberData: Member) => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  member: null,
  loading: true,
  login: () => {},
  logout: async () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [member, setMember] = useState<Member | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("memberAccessToken");
    if (token) {
      // Validate token or get profile
      apiClient.get("/member/profile")
        .then((res) => {
          setMember(res.data.data);
        })
        .catch(() => {
          localStorage.removeItem("memberAccessToken");
          localStorage.removeItem("memberRefreshToken");
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, []);

  const login = (token: string, refreshToken: string, memberData: Member) => {
    localStorage.setItem("memberAccessToken", token);
    localStorage.setItem("memberRefreshToken", refreshToken);
    setMember(memberData);
  };

  const logout = async () => {
    // No server-side logout endpoint for members — clear local storage directly
    localStorage.removeItem("memberAccessToken");
    localStorage.removeItem("memberRefreshToken");
    setMember(null);
    window.location.href = "/login";
  };

  return (
    <AuthContext.Provider value={{ member, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
