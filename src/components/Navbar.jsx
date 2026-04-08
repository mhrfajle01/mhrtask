import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const Navbar = () => {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/login");
    } catch (error) {
      console.error("Failed to log out", error);
    }
  };

  return (
    <nav className="navbar navbar-dark bg-primary shadow-sm sticky-top" style={{ background: "linear-gradient(45deg, #6a11cb 0%, #2575fc 100%)" }}>
      <div className="container">
        <Link className="navbar-brand fw-bold" to="/">
          <i className="bi bi-calendar-check me-2"></i>
          Routine Planner
        </Link>
        {currentUser && (
          <button className="btn btn-outline-light btn-sm" onClick={handleLogout}>
            <i className="bi bi-box-arrow-right me-1"></i>
            Logout
          </button>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
