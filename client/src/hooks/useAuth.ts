import { useState, useEffect, createContext, useContext } from "react";

interface User {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  permissionLevel: number;
  organizationId: number;
}

interface AuthContextType {
  user: User | null;
  sessionToken: string | null;
  isLoading: boolean;
  login: (user: User, token: string) => void;
  logout: () => void;
  hasPermission: (requiredLevel: number) => boolean;
  hasRole: (roles: string | string[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth(): AuthContextType {
  const [user, setUser] = useState<User | null>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for existing session on app start
    const token = localStorage.getItem("sessionToken");
    const userData = localStorage.getItem("user");
    
    if (token && userData) {
      try {
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);
        setSessionToken(token);
        validateSession(token);
      } catch (error) {
        console.error("Error parsing stored user data:", error);
        logout();
      }
    }
    setIsLoading(false);
  }, []);

  const validateSession = async (token: string) => {
    try {
      const response = await fetch("/api/auth/me", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      if (!response.ok) {
        logout();
      } else {
        const userData = await response.json();
        setUser(userData);
        localStorage.setItem("user", JSON.stringify(userData));
      }
    } catch (error) {
      console.error("Session validation error:", error);
      logout();
    }
  };

  const login = (userData: User, token: string) => {
    setUser(userData);
    setSessionToken(token);
    localStorage.setItem("sessionToken", token);
    localStorage.setItem("user", JSON.stringify(userData));
  };

  const logout = async () => {
    try {
      if (sessionToken) {
        await fetch("/api/auth/logout", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${sessionToken}`,
          },
        });
      }
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      setUser(null);
      setSessionToken(null);
      localStorage.removeItem("sessionToken");
      localStorage.removeItem("user");
    }
  };

  const hasPermission = (requiredLevel: number): boolean => {
    return user ? user.permissionLevel >= requiredLevel : false;
  };

  const hasRole = (roles: string | string[]): boolean => {
    if (!user) return false;
    const allowedRoles = Array.isArray(roles) ? roles : [roles];
    return allowedRoles.includes(user.role);
  };

  return {
    user,
    sessionToken,
    isLoading,
    login,
    logout,
    hasPermission,
    hasRole,
  };
}

export const AuthProvider = AuthContext.Provider;
export { AuthContext };