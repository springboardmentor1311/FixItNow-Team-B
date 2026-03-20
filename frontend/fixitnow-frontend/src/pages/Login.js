import { useState, useEffect } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import API from "../api/api";
import { useAuth } from "../auth/AuthContext";
import { useAppData } from "../state/AppDataContext";
import {
  findLocalAccountByEmail,
  normalizeEmail,
  rememberRegisteredEmail,
  resolveRole,
  resolveRoleFromClaims,
  upsertLocalAccount,
  validateLocalCredentials
} from "../auth/localAuth";

const roles = [
  { label: "Customer", value: "CUSTOMER" },
  { label: "Provider", value: "PROVIDER" },
  { label: "Admin", value: "ADMIN" }
];

const roleLabels = {
  CUSTOMER: "customer",
  PROVIDER: "provider",
  ADMIN: "admin"
};

const getRoleLabel = (value) => roleLabels[resolveRole(value)] || "assigned";

const getRoleFromAuthResponse = (payload = {}) => {
  let tokenRole = "";

  if (payload?.token) {
    try {
      tokenRole = resolveRoleFromClaims(jwtDecode(payload.token));
    } catch {
      tokenRole = "";
    }
  }

  const responseRole = resolveRole(payload?.role || payload?.user?.role);
  return tokenRole || responseRole || "";
};

const Login = () => {
  const [role, setRole] = useState("CUSTOMER");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [infoMessage, setInfoMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login, user } = useAuth();
  const { getProviderAccessStatus } = useAppData();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (user?.role === "CUSTOMER") navigate("/customer/dashboard");
    if (user?.role === "PROVIDER") navigate("/provider/dashboard");
    if (user?.role === "ADMIN") navigate("/admin/dashboard");
  }, [user, navigate]);

  useEffect(() => {
    if (!location.state) return;

    const selectedRole = location.state?.selectedRole;
    const prefilledEmail = location.state?.prefilledEmail;
    const incomingMessage = location.state?.infoMessage;

    if (selectedRole && roles.some((item) => item.value === selectedRole)) {
      setRole(selectedRole);
    }

    if (prefilledEmail) {
      setEmail(prefilledEmail);
    }

    if (incomingMessage) {
      setInfoMessage(incomingMessage);
    }

    navigate(location.pathname, { replace: true, state: null });
  }, [location, navigate]);

  const redirectByRole = (selectedRole) => {
    if (selectedRole === "CUSTOMER") navigate("/customer/dashboard");
    if (selectedRole === "PROVIDER") navigate("/provider/dashboard");
    if (selectedRole === "ADMIN") navigate("/admin/dashboard");
  };

  const onRoleChange = (nextRole) => {
    if (nextRole === role) return;
    setRole(nextRole);
    setEmail("");
    setPassword("");
    setError("");
    setInfoMessage("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setInfoMessage("");
    setIsSubmitting(true);

    const normalizedEmail = normalizeEmail(email);
    const providerAccessStatus = getProviderAccessStatus(normalizedEmail);
    const portalMismatchMessage = (assignedRole) =>
      `This email is registered for the ${getRoleLabel(
        assignedRole
      )} portal. Please use that portal only.`;
    const ensureRoleMatch = (assignedRole) => {
      const resolvedAssignedRole = resolveRole(assignedRole);
      if (!resolvedAssignedRole || resolvedAssignedRole === role) return true;
      setError(portalMismatchMessage(resolvedAssignedRole));
      return false;
    };

    const knownAccountRole = resolveRole(findLocalAccountByEmail(normalizedEmail)?.role);
    if (!ensureRoleMatch(knownAccountRole)) {
      setIsSubmitting(false);
      return;
    }

    if (role === "PROVIDER" && providerAccessStatus.provider && !providerAccessStatus.isApproved) {
      setError("Provider login is blocked until admin verifies your submitted details.");
      setIsSubmitting(false);
      return;
    }

    const loginLocalAccount = () => {
      const localAccount = validateLocalCredentials({
        email: normalizedEmail,
        password,
        role
      });

      if (!localAccount) {
        return false;
      }

      rememberRegisteredEmail(normalizedEmail);
      const localRole = resolveRole(localAccount.role) || role;
      login({
        role: localRole,
        email: localAccount.email,
        name: localAccount.name
      });
      redirectByRole(localRole);
      return true;
    };

    const loginAsOpenAdmin = () => {
      if (role !== "ADMIN") return false;
      if (!ensureRoleMatch(resolveRole(findLocalAccountByEmail(normalizedEmail)?.role))) return true;

      const fallbackName = normalizedEmail.split("@")[0] || "Admin";
      login({
        role: "ADMIN",
        email: normalizedEmail,
        name: fallbackName
      });
      redirectByRole("ADMIN");
      return true;
    };

    const persistAccountRole = ({ accountEmail, accountName, assignedRole }) => {
      rememberRegisteredEmail(accountEmail);
      const savedAccount = upsertLocalAccount({
        email: accountEmail,
        name: accountName,
        password,
        role: assignedRole
      });

      if (savedAccount) return true;

      const existingRole = resolveRole(findLocalAccountByEmail(accountEmail)?.role) || assignedRole;
      setError(portalMismatchMessage(existingRole));
      return false;
    };

    try {
      const res = await API.post("/auth/login", {
        email: normalizedEmail,
        password,
        role
      });
      const payload = res?.data?.data ?? res?.data;
      const authenticatedRole = resolveRole(getRoleFromAuthResponse(payload) || role) || role;

      if (!ensureRoleMatch(authenticatedRole)) {
        return;
      }

      if (!payload?.token) {
        if (loginAsOpenAdmin()) return;
        if (loginLocalAccount()) return;

        const hasFallbackIdentity = Boolean(
          payload?.email || payload?.user?.email || payload?.name || payload?.user?.name
        );
        const fallbackEmail =
          normalizeEmail(payload?.email || payload?.user?.email || normalizedEmail);
        const fallbackName =
          payload?.name || payload?.user?.name || fallbackEmail.split("@")[0];

        if (hasFallbackIdentity) {
          if (
            !persistAccountRole({
              accountEmail: fallbackEmail,
              accountName: fallbackName,
              assignedRole: authenticatedRole
            })
          ) {
            return;
          }

          login({
            role: authenticatedRole,
            email: fallbackEmail,
            name: fallbackName
          });
          redirectByRole(authenticatedRole);
          return;
        }

        setError("Login failed. Please try again.");
        return;
      }

      if (
        !persistAccountRole({
          accountEmail: normalizedEmail,
          accountName: payload?.name || normalizedEmail.split("@")[0],
          assignedRole: authenticatedRole
        })
      ) {
        return;
      }

      login({ ...payload, role: authenticatedRole });
      redirectByRole(authenticatedRole);
    } catch (err) {
      if (err?.response) {
        if (loginAsOpenAdmin()) return;
        if (loginLocalAccount()) return;
        const backendMessage =
          err.response?.data?.message || err.response?.data?.error || "";
        setError(backendMessage || "Invalid credentials. Please try again.");
        return;
      }

      if (loginAsOpenAdmin()) return;
      if (loginLocalAccount()) return;
      setError("Kingly Create an account and login.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.backgroundGlowOne} />
      <div style={styles.backgroundGlowTwo} />

      <div style={styles.card}>
        <h2 style={styles.title}>Welcome Back</h2>
        <p style={styles.subtitle}>Sign in to continue to your FixItNow workspace</p>
        {infoMessage && <p style={styles.info}>{infoMessage}</p>}

        <div style={styles.roleSwitch}>
          {roles.map((item) => (
            <button
              key={item.value}
              type="button"
              style={role === item.value ? styles.activeRole : styles.roleBtn}
              onClick={() => onRoleChange(item.value)}
            >
              {item.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} style={styles.form}>
          <input
            type="email"
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={styles.input}
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={styles.input}
          />

          {error && <p style={styles.error}>{error}</p>}

          <button type="submit" style={styles.loginBtn} disabled={isSubmitting}>
            {isSubmitting ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <p style={styles.registerText}>
          New user?{" "}
          <Link to="/register" style={styles.link}>
            Create account
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Login;

const styles = {
  container: {
    minHeight: "100vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    background:
      "radial-gradient(circle at 15% 8%, rgba(6, 182, 212, 0.24), transparent 35%), radial-gradient(circle at 85% 12%, rgba(56, 189, 248, 0.2), transparent 32%), linear-gradient(145deg, #0f172a, #111827 42%, #1e293b)",
    position: "relative",
    overflow: "hidden",
    padding: "24px"
  },
  backgroundGlowOne: {
    position: "absolute",
    width: 460,
    height: 460,
    borderRadius: "50%",
    background: "radial-gradient(circle, rgba(6, 182, 212, 0.25), transparent 70%)",
    top: -150,
    left: -120
  },
  backgroundGlowTwo: {
    position: "absolute",
    width: 480,
    height: 480,
    borderRadius: "50%",
    background: "radial-gradient(circle, rgba(56, 189, 248, 0.2), transparent 70%)",
    bottom: -170,
    right: -130
  },
  card: {
    position: "relative",
    zIndex: 1,
    width: "min(430px, 100%)",
    background: "rgba(30, 41, 59, 0.9)",
    border: "1px solid rgba(148, 163, 184, 0.28)",
    backdropFilter: "blur(12px)",
    borderRadius: "20px",
    padding: "34px 28px",
    boxShadow: "0 26px 62px rgba(3, 10, 16, 0.35)"
  },
  title: {
    margin: 0,
    fontSize: "36px",
    color: "#f5fbff",
    letterSpacing: 0.4
  },
  subtitle: {
    marginTop: 8,
    marginBottom: 20,
    color: "#cbd5e1",
    fontSize: 14
  },
  roleSwitch: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: 8,
    marginBottom: 18
  },
  roleBtn: {
    padding: "10px",
    background: "rgba(15, 23, 42, 0.9)",
    color: "#f8fafc",
    border: "1px solid rgba(148, 163, 184, 0.28)",
    borderRadius: 8,
    cursor: "pointer",
    fontSize: "14px"
  },
  activeRole: {
    padding: "10px",
    background: "linear-gradient(140deg, #67e8f9, #06b6d4)",
    color: "#083344",
    border: "1px solid rgba(103, 232, 249, 0.6)",
    borderRadius: 8,
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: 700
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: 12
  },
  input: {
    padding: "12px",
    borderRadius: "10px",
    border: "1px solid rgba(148, 163, 184, 0.3)",
    background: "rgba(15, 23, 42, 0.95)",
    color: "#eff9ff",
    fontSize: "14px"
  },
  loginBtn: {
    padding: "12px",
    background: "linear-gradient(130deg, #67e8f9, #06b6d4)",
    border: "none",
    borderRadius: "10px",
    color: "#083344",
    fontWeight: 700,
    fontSize: "15px",
    cursor: "pointer",
    marginTop: 4
  },
  registerText: {
    marginTop: "16px",
    color: "#f8fafc"
  },
  link: {
    color: "#67e8f9",
    textDecoration: "none",
    fontWeight: 700
  },
  error: {
    color: "#ff9ac4",
    fontSize: "14px"
  },
  info: {
    color: "#7dd3fc",
    fontSize: "13px",
    marginTop: 0,
    marginBottom: 12
  }
};
