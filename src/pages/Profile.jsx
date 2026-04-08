import { useAuth } from "../context/AuthContext";
import { useNavigate, Link } from "react-router-dom";

const Profile = () => {
  const { currentUser, userData, logout } = useAuth();
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
    <div className="container py-4 mb-5">
      <h2 className="fw-bold mb-4">My Profile</h2>

      <div className="card border-0 shadow-sm rounded-4 text-center p-5 mb-4">
        <div className="mb-3">
          <div className="bg-primary text-white d-inline-flex align-items-center justify-content-center rounded-circle" style={{ width: "80px", height: "80px", fontSize: "32px" }}>
            <i className="bi bi-person"></i>
          </div>
        </div>
        <h4 className="fw-bold mb-1">{currentUser?.email}</h4>
        <p className="text-muted">Adventurer Level {userData?.level || 1}</p>
        
        <div className="row mt-4">
          <div className="col-6 border-end">
            <h3 className="fw-bold text-primary mb-0">{userData?.xp || 0}</h3>
            <small className="text-muted text-uppercase">Total XP</small>
          </div>
          <div className="col-6">
            <h3 className="fw-bold text-success mb-0">{userData?.level || 1}</h3>
            <small className="text-muted text-uppercase">Current Level</small>
          </div>
        </div>
      </div>

      <div className="list-group shadow-sm border-0 rounded-4 overflow-hidden mb-4">
        <Link to="/settings" className="list-group-item list-group-item-action border-0 p-3 d-flex align-items-center">
          <i className="bi bi-gear-fill me-3 text-secondary"></i>
          Settings
        </Link>
        <button className="list-group-item list-group-item-action border-0 p-3 d-flex align-items-center border-top">
          <i className="bi bi-shield-lock-fill me-3 text-secondary"></i>
          Privacy
        </button>
        <button className="list-group-item list-group-item-action border-0 p-3 d-flex align-items-center border-top">
          <i className="bi bi-question-circle-fill me-3 text-secondary"></i>
          Help & Support
        </button>
      </div>

      <button className="btn btn-outline-danger w-100 rounded-pill py-3 fw-bold" onClick={handleLogout}>
        <i className="bi bi-box-arrow-right me-2"></i>
        Log Out
      </button>
    </div>
  );
};

export default Profile;
