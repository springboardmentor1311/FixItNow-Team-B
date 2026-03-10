import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "../auth/AuthContext";
import "./PortalLayout.css";

const PortalLayout = ({ portalTitle, menuItems, children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const activeItem =
    menuItems.find((item) => location.pathname.startsWith(item.path)) || menuItems[0];
  const userDisplay =
    user?.name || user?.email?.split("@")[0] || `${portalTitle} User`;
  const userInitial = userDisplay.charAt(0).toUpperCase();

  return (
    <div className="portal-app">
      <aside className="portal-sidebar">
        <Link to={menuItems[0]?.path} className="portal-brand">
          FixItNow
        </Link>

        <p className="portal-role">{portalTitle.toUpperCase()} PORTAL</p>

        <nav className="portal-nav">
          {menuItems.map((item) => {
            const isActive = location.pathname.startsWith(item.path);
            const rawBadge = Number(item.badgeCount || 0);
            const badgeCount = Number.isFinite(rawBadge) ? Math.max(0, Math.floor(rawBadge)) : 0;

            return (
              <Link
                key={item.path}
                to={item.path}
                className={`portal-nav-link ${isActive ? "active" : ""}`}
              >
                <span className="portal-nav-label">{item.label}</span>
                {badgeCount > 0 && (
                  <span className="portal-nav-badge">{badgeCount > 99 ? "99+" : badgeCount}</span>
                )}
              </Link>
            );
          })}
        </nav>

        <p className="portal-sidebar-foot">
          Reliable local services for homes and businesses.
        </p>
      </aside>

      <div className="portal-main">
        <header className="portal-topbar">
          <div className="portal-topbar-title">
            <p className="portal-meta">FixItNow Workspace</p>
            <h1>{activeItem?.label || `${portalTitle} Dashboard`}</h1>
          </div>

          <div className="portal-actions">
            <div className="portal-user">
              <span className="portal-avatar">{userInitial}</span>
              <div>
                <p className="portal-user-name">{userDisplay}</p>
                <p className="portal-user-role">{portalTitle}</p>
              </div>
            </div>

            <button
              className="portal-button"
              onClick={() => {
                logout();
                navigate("/login");
              }}
            >
              Logout
            </button>
          </div>
        </header>

        <motion.main
          className="portal-content"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          key={location.pathname}
        >
          {children}
        </motion.main>
      </div>
    </div>
  );
};

export default PortalLayout;
