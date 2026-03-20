import Navbar from "./Navbar";
import Sidebar from "./Sidebar";
import { useAuth } from "../auth/AuthContext";
import { motion } from "framer-motion";

const Layout = ({ children }) => {
  const { user } = useAuth();

  return (
    <div>
      <Navbar />
      <div style={{ display: "flex" }}>
        <Sidebar role={user?.role} />

        <motion.div
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4 }}
          style={styles.content}
        >
          {children}
        </motion.div>
      </div>
    </div>
  );
};

export default Layout;

const styles = {
  content: {
    flex: 1,
    padding: 40,
    background: "linear-gradient(135deg,#141E30,#243B55)",
    minHeight: "100vh",
    color: "white"
  }
};
