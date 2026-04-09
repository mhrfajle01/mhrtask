import { useEffect, useState, useMemo } from "react";
import { useAuth } from "../context/AuthContext";
import { Link, useNavigate } from "react-router-dom";

const Notifications = () => {
  const { notifications, markAllAsRead } = useAuth();
  const [filter, setFilter] = useState('all');
  const navigate = useNavigate();

  useEffect(() => {
    markAllAsRead();
  }, [notifications.length, markAllAsRead]);

  const categories = [
    { id: 'all', label: 'All', icon: 'bi-grid' },
    { id: 'progression', label: 'Progression', icon: 'bi-graph-up-arrow' },
    { id: 'quest', label: 'Quests', icon: 'bi-trophy' },
    { id: 'system', label: 'System', icon: 'bi-cpu' }
  ];

  const rarityStyles = {
    common: { border: 'border-light', bg: 'bg-white', glow: '' },
    rare: { border: 'border-info border-opacity-50', bg: 'bg-info bg-opacity-10', glow: 'shadow-info-sm' },
    epic: { border: 'border-warning border-opacity-50', bg: 'bg-warning bg-opacity-10', glow: 'shadow-warning-sm' },
    legendary: { border: 'border-danger border-opacity-50', bg: 'bg-danger bg-opacity-10', glow: 'animate-pulse shadow-legendary' }
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return "Just now";
    const date = timestamp.toDate();
    const now = new Date();
    const diff = Math.floor((now - date) / 1000);
    if (diff < 60) return "Just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return date.toLocaleDateString();
  };

  const filteredNotifs = useMemo(() => 
    filter === 'all' ? notifications : notifications.filter(n => n.category === filter),
    [filter, notifications]
  );

  const groupedNotifs = useMemo(() => {
    const todayStr = new Date().toDateString();
    const yesterdayStr = new Date(Date.now() - 86400000).toDateString();
    
    return filteredNotifs.reduce((groups, n) => {
      const date = n.timestamp?.toDate().toDateString() || todayStr;
      let group = "Earlier";
      if (date === todayStr) group = "Today";
      else if (date === yesterdayStr) group = "Yesterday";
      
      if (!groups[group]) groups[group] = [];
      groups[group].push(n);
      return groups;
    }, {});
  }, [filteredNotifs]);

  return (
    <div className="container py-4">
      <div className="d-flex justify-content-between align-items-center mb-4 px-2">
        <h2 className="fw-bold m-0 h3">Activity Log</h2>
        <span className="badge bg-light text-dark rounded-pill border">{notifications.length} Total</span>
      </div>

      {/* Category Filters */}
      <div className="d-flex gap-2 overflow-x-auto pb-3 mb-3 no-scrollbar px-2">
        {categories.map(cat => (
          <button 
            key={cat.id} 
            onClick={() => setFilter(cat.id)}
            className={`btn btn-sm rounded-pill px-3 fw-bold d-flex align-items-center gap-2 whitespace-nowrap transition-all ${filter === cat.id ? 'btn-primary shadow-sm' : 'btn-light border text-muted'}`}
          >
            <i className={`bi ${cat.icon}`}></i>
            {cat.label}
          </button>
        ))}
      </div>

      <div className="d-flex flex-column gap-4">
        {filteredNotifs.length === 0 ? (
          <div className="text-center py-5 opacity-50 bg-light rounded-4 border border-dashed">
            <i className="bi bi-journal-text fs-1"></i>
            <p className="mt-2 fw-bold">Nothing to show here.</p>
          </div>
        ) : (
          Object.entries(groupedNotifs).map(([group, notifs]) => (
            <div key={group}>
              <h6 className="text-uppercase small fw-bold text-muted mb-3 px-2 letter-spacing-1">{group}</h6>
              <div className="d-flex flex-column gap-2">
                {notifs.map((notif) => {
                  const style = rarityStyles[notif.rarity || 'common'];
                  return (
                    <div 
                      key={notif.id} 
                      className={`card border-2 shadow-sm rounded-4 overflow-hidden transition-all ${style.border} ${style.bg} ${style.glow} ${!notif.read ? 'border-primary' : ''}`}
                    >
                      <div className="card-body p-3">
                        <div className="d-flex align-items-center">
                          <div className={`rounded-circle bg-${notif.color || 'primary'} bg-opacity-20 p-2 me-3 text-${notif.color || 'primary'} d-flex align-items-center justify-content-center`} style={{ width: '45px', height: '45px' }}>
                            <i className={`bi ${notif.icon || 'bi-info-circle'} fs-4`}></i>
                          </div>
                          <div className="flex-grow-1">
                            <div className="d-flex justify-content-between align-items-start">
                              <h6 className={`fw-bold mb-0 ${notif.rarity === 'legendary' ? 'text-danger' : ''}`}>
                                {notif.title}
                                {notif.stackCount > 1 && <span className="ms-2 badge bg-primary bg-opacity-10 text-primary small">x{notif.stackCount}</span>}
                              </h6>
                              <small className="text-muted" style={{ fontSize: '0.7rem' }}>{formatTime(notif.timestamp)}</small>
                            </div>
                            <p className="small text-muted mb-0 mt-1">{notif.message}</p>
                          </div>
                        </div>
                        {notif.action && (
                          <div className="mt-3 pt-2 border-top border-dark border-opacity-10 d-grid">
                            <button 
                              onClick={() => navigate(notif.action)}
                              className="btn btn-sm btn-dark rounded-pill fw-bold"
                            >
                              View Progress
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>

      <div className="mt-5 text-center pb-5">
        <Link to="/" className="btn btn-outline-secondary rounded-pill px-4 btn-sm fw-bold">Return to Map</Link>
      </div>
    </div>
  );
};

export default Notifications;
