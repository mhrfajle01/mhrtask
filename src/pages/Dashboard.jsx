import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { db } from "../firebase/config";
import { collection, query, onSnapshot } from "firebase/firestore";
import InstallApp from "../components/InstallApp";

const Dashboard = () => {
  const { currentUser, userData } = useAuth();

  useEffect(() => {
    if (!currentUser) return;
    const q = query(collection(db, "users", currentUser.uid, "routines"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      // Logic for summary if needed, otherwise just keeping listener for consistency
    });
    return () => unsubscribe();
  }, [currentUser]);

  const getLevelColor = (level) => {
    if (level >= 5) return "#ff00ff";
    if (level >= 4) return "#00d4ff";
    if (level >= 3) return "#ffd700";
    if (level >= 2) return "#c0c0c0";
    return "#cd7f32";
  };

  const currentLevel = userData?.level || 1;
  const currentXP = userData?.xp || 0;
  const nextLevelXP = Math.pow(currentLevel, 2) * 100;
  const prevLevelXP = Math.pow(currentLevel - 1, 2) * 100;
  const xpInLevel = currentXP - prevLevelXP;
  const xpNeededForLevel = nextLevelXP - prevLevelXP;
  
  // FIX: XP progress calculation with better visibility
  const progress = Math.max(3, Math.min((xpInLevel / xpNeededForLevel) * 100, 100)) || 3;

  // New BD Circadian Windows
  const morningProgress = Math.min(((userData?.morningTime || 0) / 120) * 100, 100);
  const afternoonProgress = Math.min(((userData?.afternoonTime || 0) / 120) * 100, 100);
  const nightProgress = Math.min(((userData?.nightTime || 0) / 120) * 100, 100);
  
  const currentHour = new Date().getHours();
  const getActiveSegment = () => {
    if (currentHour >= 3 && currentHour < 12) return "Morning";
    if (currentHour >= 12 && currentHour < 18) return "Afternoon";
    return "Night";
  };

  // Lifetime Mins
  const currentSessionSecs = (userData?.morningTime || 0) + (userData?.afternoonTime || 0) + (userData?.nightTime || 0);
  const totalDisplayMins = Math.round((userData?.totalMinutes || 0) + (currentSessionSecs / 60));

  return (
    <div className="container py-4 mb-5">
      <InstallApp />
      <div className="row g-3">
        
        {/* Connection Odometer (Mastery Map) */}
        <div className="col-12">
          <div className="card border-0 shadow-sm rounded-4 overflow-hidden" style={{ background: "#1a1a1a" }}>
            <div className="card-body p-4 text-white">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <span className="badge bg-primary rounded-pill px-3 fw-bold shadow-sm">Mastery Map</span>
                <div className="text-warning fw-bold d-flex flex-column align-items-end">
                  <div className="d-flex align-items-center">
                    <i className="bi bi-fire me-1 fs-5"></i>
                    <span>{userData?.streak || 0} Day Streak</span>
                  </div>
                  <small className="text-white-50" style={{ fontSize: "10px" }}>Best: {userData?.highestStreak || 0}d</small>
                </div>
              </div>
              <div className="row text-center mb-2">
                <div className="col-4">
                  <div className="fs-2 fw-bold text-info">{userData?.totalDaysConnected || 0}d</div>
                  <div className="text-muted small text-uppercase fw-bold" style={{ fontSize: "9px" }}>Lifetime Days</div>
                </div>
                <div className="col-4 border-start border-secondary border-opacity-25">
                  <div className="fs-2 fw-bold text-success">{totalDisplayMins}m</div>
                  <div className="text-muted small text-uppercase fw-bold" style={{ fontSize: "9px" }}>Lifetime Mins</div>
                </div>
                <div className="col-4 border-start border-secondary border-opacity-25">
                  <div className="fs-2 fw-bold text-warning">LVL {currentLevel}</div>
                  <div className="text-muted small text-uppercase fw-bold" style={{ fontSize: "9px" }}>Global Rank</div>
                </div>
              </div>
              {/* Yesterday Status Confirmation */}
              <div className="mt-3 pt-3 border-top border-secondary border-opacity-25 text-center">
                <small className="text-white-50 small">
                  Status: <span className="text-success fw-bold">Active Connection Survives!</span>
                </small>
              </div>
            </div>
          </div>
        </div>

        {/* Daily Ritual HUD */}
        <div className="col-12">
          <div className="card border-0 shadow-sm rounded-4 p-4 bg-white position-relative overflow-hidden">
            {/* Background Effects */}
            {userData?.dayLocked ? (
              <div className="position-absolute top-0 start-0 w-100 h-100 bg-success bg-opacity-10"></div>
            ) : userData?.isProtected ? (
              <div className="position-absolute top-0 start-0 w-100 h-100 bg-info bg-opacity-10"></div>
            ) : null}
            
            <div className="position-relative">
              <h6 className="fw-bold text-secondary mb-1 d-flex align-items-center">
                Daily Ritual (BD Time)
                {userData?.dayLocked ? (
                  <span className="ms-auto text-success fw-bold small"><i className="bi bi-patch-check-fill me-1"></i>GOLD SECURED</span>
                ) : userData?.isProtected ? (
                  <span className="ms-auto text-info fw-bold small"><i className="bi bi-shield-check me-1"></i>BRONZE PROTECTED</span>
                ) : (
                  <span className="ms-auto text-muted fw-bold small opacity-50"><i className="bi bi-shield me-1"></i>NOT PROTECTED</span>
                )}
              </h6>
              <h4 className="fw-bold mb-4">
                {userData?.dayLocked ? "Quest Complete! +1 Streak" : userData?.isProtected ? "Streak Saved! Finish Time segments" : `Current Window: ${getActiveSegment()}`}
              </h4>

              <div className="row g-3 mb-4 text-center">
                <div className="col-4">
                  <div className={`p-2 rounded-3 ${getActiveSegment() === "Morning" && !userData?.dayLocked ? "bg-warning bg-opacity-10 border border-warning border-opacity-25" : ""}`}>
                    <div className={`fs-2 mb-1 ${userData?.morningTime >= 120 ? "text-warning" : "text-muted opacity-25"}`}>
                      <i className="bi bi-sunrise-fill"></i>
                    </div>
                    <div className="bg-light rounded-pill overflow-hidden" style={{ height: "6px" }}>
                      <div className="h-100 bg-warning" style={{ width: `${morningProgress}%`, transition: "width 1s ease" }}></div>
                    </div>
                    <small className="fw-bold d-block mt-1" style={{ fontSize: "8px" }}>3AM-12PM</small>
                  </div>
                </div>
                <div className="col-4">
                  <div className={`p-2 rounded-3 ${getActiveSegment() === "Afternoon" && !userData?.dayLocked ? "bg-danger bg-opacity-10 border border-danger border-opacity-25" : ""}`}>
                    <div className={`fs-2 mb-1 ${userData?.afternoonTime >= 120 ? "text-danger" : "text-muted opacity-25"}`}>
                      <i className="bi bi-sun-fill"></i>
                    </div>
                    <div className="bg-light rounded-pill overflow-hidden" style={{ height: "6px" }}>
                      <div className="h-100 bg-danger" style={{ width: `${afternoonProgress}%`, transition: "width 1s ease" }}></div>
                    </div>
                    <small className="fw-bold d-block mt-1" style={{ fontSize: "8px" }}>12PM-6PM</small>
                  </div>
                </div>
                <div className="col-4">
                  <div className={`p-2 rounded-3 ${getActiveSegment() === "Night" && !userData?.dayLocked ? "bg-primary bg-opacity-10 border border-primary border-opacity-25" : ""}`}>
                    <div className={`fs-2 mb-1 ${userData?.nightTime >= 120 ? "text-primary" : "text-muted opacity-25"}`}>
                      <i className="bi bi-moon-stars-fill"></i>
                    </div>
                    <div className="bg-light rounded-pill overflow-hidden" style={{ height: "6px" }}>
                      <div className="h-100 bg-primary" style={{ width: `${nightProgress}%`, transition: "width 1s ease" }}></div>
                    </div>
                    <small className="fw-bold d-block mt-1" style={{ fontSize: "8px" }}>6PM-3AM</small>
                  </div>
                </div>
              </div>
              
              <div className="d-flex align-items-center mb-3">
                <div className={`fs-3 me-3 ${userData?.actionsToday >= 2 ? 'text-success' : 'text-muted opacity-25'}`}>
                  <i className={userData?.actionsToday >= 2 ? "bi bi-shield-fill-check" : "bi bi-shield"}></i>
                </div>
                <div className="flex-grow-1">
                  <div className="fw-bold small d-flex justify-content-between">
                    PROTECTION ACTIONS
                    <span className={userData?.actionsToday >= 2 ? "text-success fw-bold" : "text-primary fw-bold"}>{userData?.actionsToday || 0}/2</span>
                  </div>
                  <div className="text-muted" style={{ fontSize: "10px" }}>{userData?.actionsToday >= 2 ? "Streak is SAFE for today!" : "Do 2 actions to save your streak"}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Character Sheet with VIVID GRADIENT XP BAR */}
        <div className="col-12">
          <div className="p-4 rounded-4 shadow-sm text-white border-0" 
               style={{ background: `linear-gradient(135deg, ${getLevelColor(currentLevel)} 0%, #000 100%)` }}>
            <h4 className="mb-1 opacity-75">Character Sheet</h4>
            <h2 className="fw-bold mb-3 d-flex align-items-center">
              {currentUser?.email?.split('@')[0]}
              <span className="ms-auto badge rounded-pill border border-white border-opacity-25 shadow-sm" style={{ fontSize: "14px" }}>
                LVL {currentLevel}
              </span>
            </h2>
            
            <div className="progress mt-3 bg-dark bg-opacity-50" style={{ height: "16px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.1)" }}>
              <div 
                className="progress-bar" 
                role="progressbar" 
                style={{ 
                  width: `${progress}%`, 
                  borderRadius: "8px", 
                  transition: "width 1.5s cubic-bezier(0.34, 1.56, 0.64, 1)",
                  background: "linear-gradient(90deg, #ff00cc 0%, #3333ff 100%)",
                  boxShadow: "0 0 12px rgba(255, 0, 204, 0.6)"
                }}
              ></div>
            </div>
            <div className="d-flex justify-content-between mt-2">
              <small className="fw-bold">{currentXP} XP</small>
              <small className="opacity-75">Goal: {nextLevelXP} XP</small>
            </div>
          </div>
        </div>

        {/* Life Stats Grid */}
        <div className="col-12">
          <div className="card border-0 shadow-sm rounded-4 p-4 bg-white">
            <h6 className="fw-bold text-secondary mb-3 px-1">Life Stats</h6>
            <div className="row g-3">
              <div className="col-6">
                <div className="p-3 rounded-4 bg-danger bg-opacity-10 text-danger border border-danger border-opacity-10 text-center shadow-sm">
                  <div className="fw-bold fs-3">{userData?.str || 0}</div>
                  <div className="fw-bold small text-uppercase" style={{ fontSize: "11px", letterSpacing: "1px" }}>Strength</div>
                </div>
              </div>
              <div className="col-6">
                <div className="p-3 rounded-4 bg-info bg-opacity-10 text-info border border-info border-opacity-10 text-center shadow-sm">
                  <div className="fw-bold fs-3">{userData?.int || 0}</div>
                  <div className="fw-bold small text-uppercase" style={{ fontSize: "11px", letterSpacing: "1px" }}>Intelligence</div>
                </div>
              </div>
              <div className="col-6">
                <div className="p-3 rounded-4 bg-success bg-opacity-10 text-success border border-success border-opacity-10 text-center shadow-sm">
                  <div className="fw-bold fs-3">{userData?.spr || 0}</div>
                  <div className="fw-bold small text-uppercase" style={{ fontSize: "11px", letterSpacing: "1px" }}>Spirit</div>
                </div>
              </div>
              <div className="col-6">
                <div className="p-3 rounded-4 bg-warning bg-opacity-10 text-warning-emphasis border border-warning border-opacity-10 text-center shadow-sm">
                  <div className="fw-bold fs-3">{userData?.cha || 0}</div>
                  <div className="fw-bold small text-uppercase" style={{ fontSize: "11px", letterSpacing: "1px" }}>Charisma</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Links */}
        <div className="col-12 mt-2 pb-4">
          <h5 className="fw-bold px-1 mb-3">Quick Links</h5>
          <div className="list-group shadow-sm border-0 rounded-4 overflow-hidden mb-5">
            <Link to="/routine" className="list-group-item list-group-item-action border-0 p-3 d-flex align-items-center">
              <div className="bg-primary bg-opacity-10 p-2 rounded-3 me-3 text-primary"><i className="bi bi-list-task fs-5"></i></div>
              <div><div className="fw-bold">Routine Planner</div><small className="text-muted">Habits</small></div>
              <i className="bi bi-chevron-right ms-auto text-muted"></i>
            </Link>
            <Link to="/todos" className="list-group-item list-group-item-action border-0 p-3 d-flex align-items-center border-top">
              <div className="bg-success bg-opacity-10 p-2 rounded-3 me-3 text-success"><i className="bi bi-check2-square fs-5"></i></div>
              <div><div className="fw-bold">To-Do List</div><small className="text-muted">Goals</small></div>
              <i className="bi bi-chevron-right ms-auto text-muted"></i>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
