import { useMemo } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAppData } from "../state/AppDataContext";

const statusLabelByCode = {
  APPROVED: "Approved",
  PENDING: "Pending Review",
  ON_HOLD: "Under Review",
  NOT_FOUND: "Not Found"
};

const ProviderPendingApproval = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { getProviderAccessStatus } = useAppData();

  const providerName = location.state?.name || "Service Provider";
  const providerEmail = location.state?.email || "";

  const accessStatus = useMemo(() => {
    if (!providerEmail) {
      return { status: "PENDING", isApproved: false };
    }
    return getProviderAccessStatus(providerEmail);
  }, [getProviderAccessStatus, providerEmail]);

  const canLogin = accessStatus?.isApproved;
  const statusCode = accessStatus?.status || "PENDING";
  const statusLabel = statusLabelByCode[statusCode] || statusCode;

  const goToLogin = () => {
    navigate("/login", {
      state: {
        selectedRole: "PROVIDER",
        prefilledEmail: providerEmail,
        infoMessage: canLogin
          ? "Admin approval is complete. You can log in as a provider now."
          : "Your provider account is pending admin approval. Please try again after approval."
      }
    });
  };

  return (
    <div style={styles.container}>
      <div style={styles.glowOne} />
      <div style={styles.glowTwo} />

      <div style={styles.card}>
        <h1 style={styles.title}>Registration Submitted</h1>
        <p style={styles.subtitle}>
          {providerName}, your provider account is in verification queue.
        </p>

        <div style={styles.infoBlock}>
          <p style={styles.infoRow}>
            <strong>Status:</strong> {statusLabel}
          </p>
          <p style={styles.infoRow}>
            <strong>Email:</strong> {providerEmail || "Not available"}
          </p>
          <p style={styles.infoRow}>
            <strong>Login Access:</strong>{" "}
            {canLogin ? "Enabled - admin approved your account." : "Blocked until admin approval."}
          </p>
        </div>

        <div style={styles.buttonRow}>
          <button style={styles.primaryButton} onClick={goToLogin}>
            Go to Provider Login
          </button>
          <Link to="/" style={styles.link}>
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ProviderPendingApproval;

const styles = {
  container: {
    minHeight: "100vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    background:
      "radial-gradient(circle at 14% 10%, rgba(6, 182, 212, 0.22), transparent 34%), radial-gradient(circle at 85% 12%, rgba(56, 189, 248, 0.2), transparent 32%), linear-gradient(150deg, #0f172a, #111827 42%, #1e293b)",
    position: "relative",
    overflow: "hidden",
    padding: "20px"
  },
  glowOne: {
    position: "absolute",
    width: 480,
    height: 480,
    borderRadius: "50%",
    background: "radial-gradient(circle, rgba(6, 182, 212, 0.24), transparent 70%)",
    top: -180,
    right: -150
  },
  glowTwo: {
    position: "absolute",
    width: 520,
    height: 520,
    borderRadius: "50%",
    background: "radial-gradient(circle, rgba(56, 189, 248, 0.19), transparent 70%)",
    bottom: -220,
    left: -190
  },
  card: {
    position: "relative",
    zIndex: 1,
    width: "min(620px, 100%)",
    background: "rgba(30, 41, 59, 0.9)",
    border: "1px solid rgba(148, 163, 184, 0.3)",
    borderRadius: "20px",
    backdropFilter: "blur(12px)",
    padding: "34px"
  },
  title: {
    margin: 0,
    color: "#f6fbff",
    fontSize: 34
  },
  subtitle: {
    marginTop: 10,
    color: "#cbd5e1",
    fontSize: 15
  },
  infoBlock: {
    marginTop: 22,
    background: "rgba(15, 23, 42, 0.78)",
    border: "1px solid rgba(148, 163, 184, 0.3)",
    borderRadius: 12,
    padding: 14
  },
  infoRow: {
    margin: "8px 0",
    color: "#e2e8f0",
    fontSize: 14
  },
  buttonRow: {
    marginTop: 20,
    display: "flex",
    alignItems: "center",
    gap: 14,
    flexWrap: "wrap"
  },
  primaryButton: {
    border: "none",
    borderRadius: 10,
    padding: "11px 16px",
    background: "linear-gradient(130deg, #67e8f9, #06b6d4)",
    color: "#083344",
    fontWeight: 700,
    cursor: "pointer"
  },
  link: {
    color: "#67e8f9",
    textDecoration: "none",
    fontWeight: 700
  }
};
