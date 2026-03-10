import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

const LandingPage = () => {
  const navigate = useNavigate();

  return (
    <div style={styles.container}>
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        style={styles.hero}
      >
        <h1 style={styles.title}>FixItNow</h1>
        <p style={styles.subtitle}>
          Connecting Customers with Trusted Service Professionals
        </p>

        <div style={styles.buttonGroup}>
          <button style={styles.primaryBtn} onClick={() => navigate("/login")}>
            Sign In
          </button>

          <button style={styles.secondaryBtn} onClick={() => navigate("/register")}>
            Register
          </button>
        </div>
      </motion.div>

      <div style={styles.features}>
        <div style={styles.card}>
          <h3>Verified Providers</h3>
          <p>All service providers are verified for safety and trust.</p>
        </div>

        <div style={styles.card}>
          <h3>Fast Booking</h3>
          <p>Book services quickly and easily with just a few clicks.</p>
        </div>

        <div style={styles.card}>
          <h3>Secure Platform</h3>
          <p>Secure authentication and role-based access control.</p>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;

const styles = {
  container: {
    minHeight: "100vh",
    background:
      "radial-gradient(circle at 12% 10%, rgba(6, 182, 212, 0.2), transparent 32%), radial-gradient(circle at 88% 14%, rgba(56, 189, 248, 0.17), transparent 28%), linear-gradient(140deg, #0f172a, #111827 45%, #1e293b)",
    color: "#f2faff",
    padding: "80px 40px",
    textAlign: "center"
  },
  hero: {
    marginBottom: 80
  },
  title: {
    fontSize: 58,
    color: "#f8fafc",
    letterSpacing: 0.6,
    margin: 0
  },
  subtitle: {
    fontSize: 21,
    marginTop: 20,
    marginBottom: 34,
    color: "#cbd5e1"
  },
  buttonGroup: {
    display: "flex",
    justifyContent: "center",
    gap: 20
  },
  primaryBtn: {
    padding: "14px 34px",
    background: "linear-gradient(130deg, #67e8f9, #06b6d4)",
    border: "none",
    borderRadius: 10,
    fontSize: 16,
    color: "#083344",
    fontWeight: 700,
    cursor: "pointer"
  },
  secondaryBtn: {
    padding: "14px 34px",
    background: "linear-gradient(130deg, #38bdf8, #0ea5e9)",
    border: "none",
    borderRadius: 10,
    fontSize: 16,
    color: "#082f49",
    fontWeight: 700,
    cursor: "pointer"
  },
  features: {
    display: "flex",
    justifyContent: "center",
    gap: 30,
    flexWrap: "wrap"
  },
  card: {
    background: "rgba(30, 41, 59, 0.9)",
    border: "1px solid rgba(148, 163, 184, 0.3)",
    backdropFilter: "blur(10px)",
    padding: 30,
    borderRadius: 14,
    width: 250
  }
};
