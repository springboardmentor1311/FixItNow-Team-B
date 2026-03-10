import { Link } from "react-router-dom";

const Sidebar = ({ role }) => {

  const links = {
    CUSTOMER: [
      { name: "Dashboard", path: "/customer" },
      { name: "My Bookings", path: "/customer/bookings" }
    ],
    PROVIDER: [
      { name: "Dashboard", path: "/provider" },
      { name: "Service Requests", path: "/provider/requests" }
    ],
    ADMIN: [
      { name: "Dashboard", path: "/admin" },
      { name: "Manage Users", path: "/admin/users" }
    ]
  };

  return (
    <div style={styles.sidebar}>
      {links[role]?.map((link, index) => (
        <Link key={index} to={link.path} style={styles.link}>
          {link.name}
        </Link>
      ))}
    </div>
  );
};

export default Sidebar;

const styles = {
  sidebar: {
    width: 220,
    background: "#1f2937",
    height: "100vh",
    padding: 30,
    display: "flex",
    flexDirection: "column",
    gap: 20
  },
  link: {
    color: "white",
    textDecoration: "none",
    fontSize: 16
  }
};
