import { useAuth } from "../auth/AuthContext";
import { useNavigate } from "react-router-dom";

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div style={styles.navbar}>
      <h2 style={styles.logo}>FixItNow</h2>

      <div style={styles.rightSection}>
        {user && (
          <>
            <span style={styles.userName}>
              {user.name} {user.verified && <span style={styles.badge}>✔ Verified</span>}
            </span>

            <button
              style={styles.logoutBtn}
              onClick={() => {
                logout();
                navigate("/login");
              }}
            >
              Logout
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default Navbar;

const styles = {
  navbar: {
    height: 70,
    background: "#111827",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "0 40px",
    color: "white",
    borderBottom: "1px solid #2d3748"
  },
  logo: {
    color: "#6C5CE7",
    fontSize: 24
  },
  rightSection: {
    display: "flex",
    alignItems: "center",
    gap: 20
  },
  userName: {
    fontSize: 16
  },
  badge: {
    background: "#00CEC9",
    padding: "4px 8px",
    borderRadius: 6,
    fontSize: 12,
    marginLeft: 8,
    color: "black",
    fontWeight: "bold"
  },
  logoutBtn: {
    background: "#6C5CE7",
    border: "none",
    padding: "8px 14px",
    borderRadius: 6,
    color: "white",
    cursor: "pointer"
  }
};
