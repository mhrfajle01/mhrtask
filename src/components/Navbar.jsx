import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const Navbar = () => {
  const { currentUser, logout, unreadCount } = useAuth();
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
    <nav className="navbar navbar-dark bg-primary shadow-sm sticky-top" style={{ background: "linear-gradient(45deg, #6a11cb 0%, #2575fc 100%)", zIndex: 1040 }}>
      <div className="container d-flex justify-content-between align-items-center">
        <Link className="navbar-brand fw-bold d-flex align-items-center" to="/">
          <i className="bi bi-calendar-check me-2 fs-4"></i>
          <span>Routine Planner</span>
        </Link>
        
        {currentUser && (
          <div className="d-flex align-items-center gap-3">
            <Link to="/notifications" className="position-relative text-white opacity-100">
              <i className="bi bi-bell-fill fs-4"></i>
              {unreadCount > 0 && (
                <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger border border-white" style={{ fontSize: '0.6rem' }}>
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </Link>
            <button className="btn btn-link text-white p-0" onClick={handleLogout}>
              <i className="bi bi-box-arrow-right fs-4"></i>
            </button>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
