import React, { createContext, useState, useEffect, useContext } from "react";
import { jwtDecode } from "jwt-decode";
import { resolveRole, resolveRoleFromClaims } from "./localAuth";

export const AuthContext = createContext();
const ACTIVE_ROLE_KEY = "fixitnow_active_role";
const AUTH_USER_KEY = "fixitnow_auth_user";

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);

  // Restore user from token (or demo session)
  useEffect(() => {
    const token = localStorage.getItem("token");
    const demoUser = localStorage.getItem("demo_user");
    const storedAuthUser = localStorage.getItem(AUTH_USER_KEY);
    const sessionRole = localStorage.getItem(ACTIVE_ROLE_KEY);

    if (token) {
      try {
        const decoded = jwtDecode(token);
        const decodedRole = resolveRoleFromClaims(decoded);
        const resolvedRole = decodedRole || resolveRole(sessionRole);
        let persistedUser = null;
        try {
          persistedUser = storedAuthUser ? JSON.parse(storedAuthUser) : null;
        } catch {
          persistedUser = null;
        }
        setUser({
          ...(persistedUser || {}),
          ...decoded,
          role: resolvedRole || persistedUser?.role || decoded?.role
        });
      } catch {
        localStorage.removeItem("token");
        localStorage.removeItem(ACTIVE_ROLE_KEY);
        localStorage.removeItem(AUTH_USER_KEY);
      }
      return;
    }

    if (demoUser) {
      try {
        const parsedDemoUser = JSON.parse(demoUser);
        const resolvedRole = resolveRole(parsedDemoUser?.role) || resolveRole(sessionRole);
        setUser({
          ...parsedDemoUser,
          role: resolvedRole || parsedDemoUser?.role
        });
      } catch {
        localStorage.removeItem("demo_user");
        localStorage.removeItem(ACTIVE_ROLE_KEY);
      }
    }
  }, []);

  const login = (data) => {
    // Real backend auth
    if (data?.token) {
      localStorage.setItem("token", data.token);
      localStorage.removeItem("demo_user");

      const decoded = jwtDecode(data.token);
      const decodedRole = resolveRoleFromClaims(decoded);
      const resolvedRole = decodedRole || resolveRole(data?.role);
      if (resolvedRole) {
        localStorage.setItem(ACTIVE_ROLE_KEY, resolvedRole);
      } else {
        localStorage.removeItem(ACTIVE_ROLE_KEY);
      }

      const backendUser = data?.user && typeof data.user === "object" ? data.user : {};
      if (backendUser && Object.keys(backendUser).length) {
        localStorage.setItem(AUTH_USER_KEY, JSON.stringify({ ...backendUser, role: resolvedRole || backendUser?.role }));
      } else {
        localStorage.removeItem(AUTH_USER_KEY);
      }

      setUser({
        ...backendUser,
        ...decoded,
        role: resolvedRole || backendUser?.role || decoded?.role
      });
      return;
    }

    // Frontend-only/demo auth fallback
    const resolvedRole = resolveRole(data?.role);
    const demoAuthUser = {
      role: resolvedRole,
      email: data?.email,
      name: data?.name || data?.email || "Demo User"
    };

    localStorage.removeItem("token");
    localStorage.removeItem(AUTH_USER_KEY);
    if (resolvedRole) {
      localStorage.setItem(ACTIVE_ROLE_KEY, resolvedRole);
    } else {
      localStorage.removeItem(ACTIVE_ROLE_KEY);
    }
    localStorage.setItem("demo_user", JSON.stringify(demoAuthUser));
    setUser(demoAuthUser);
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("demo_user");
    localStorage.removeItem(ACTIVE_ROLE_KEY);
    localStorage.removeItem(AUTH_USER_KEY);
    setUser(null);
  };

  const updateUser = (updates) => {
    setUser((prev) => {
      if (!prev) return prev;

      const nextUser = { ...prev, ...updates };
      const hasToken = Boolean(localStorage.getItem("token"));
      const resolvedRole = resolveRole(nextUser?.role);
      if (resolvedRole) {
        localStorage.setItem(ACTIVE_ROLE_KEY, resolvedRole);
      } else {
        localStorage.removeItem(ACTIVE_ROLE_KEY);
      }

      if (!hasToken) {
        localStorage.setItem(
          "demo_user",
          JSON.stringify({
            ...nextUser,
            role: resolvedRole || nextUser?.role
          })
        );
      }

      return {
        ...nextUser,
        role: resolvedRole || nextUser?.role
      };
    });
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
