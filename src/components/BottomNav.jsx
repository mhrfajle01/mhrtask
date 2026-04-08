import { NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const BottomNav = () => {
  const { currentUser } = useAuth();

  if (!currentUser) return null;

  return (
    <nav className="navbar fixed-bottom navbar-light bg-white border-top shadow-sm py-1" style={{ zIndex: 1030 }}>
      <div className="container d-flex justify-content-around">
        <NavLink to="/" className={({ isActive }) => `nav-link text-center ${isActive ? "text-primary fw-bold" : "text-secondary"}`}>
          <div className="fs-4"><i className="bi bi-house-door"></i></div>
          <small style={{ fontSize: "10px" }}>Home</small>
        </NavLink>
        <NavLink to="/routine" className={({ isActive }) => `nav-link text-center ${isActive ? "text-primary fw-bold" : "text-secondary"}`}>
          <div className="fs-4"><i className="bi bi-list-task"></i></div>
          <small style={{ fontSize: "10px" }}>Routine</small>
        </NavLink>
        <NavLink to="/todos" className={({ isActive }) => `nav-link text-center ${isActive ? "text-primary fw-bold" : "text-secondary"}`}>
          <div className="fs-4"><i className="bi bi-check2-square"></i></div>
          <small style={{ fontSize: "10px" }}>Todos</small>
        </NavLink>
        <NavLink to="/journal" className={({ isActive }) => `nav-link text-center ${isActive ? "text-primary fw-bold" : "text-secondary"}`}>
          <div className="fs-4"><i className="bi bi-journal-text"></i></div>
          <small style={{ fontSize: "10px" }}>Journal</small>
        </NavLink>
        <NavLink to="/profile" className={({ isActive }) => `nav-link text-center ${isActive ? "text-primary fw-bold" : "text-secondary"}`}>
          <div className="fs-4"><i className="bi bi-person"></i></div>
          <small style={{ fontSize: "10px" }}>Profile</small>
        </NavLink>
      </div>
    </nav>
  );
};

export default BottomNav;
