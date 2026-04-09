import { useAuth } from "../context/AuthContext";

const Toast = () => {
  const { activeToast } = useAuth();

  if (!activeToast) return null;

  const rarityStyles = {
    common: 'border-light bg-white',
    rare: 'border-info bg-info bg-opacity-10',
    epic: 'border-warning bg-warning bg-opacity-10 shadow-warning-sm',
    legendary: 'border-danger bg-danger bg-opacity-10 shadow-legendary animate-pulse'
  };

  return (
    <div className="position-fixed top-0 start-50 translate-middle-x mt-3" style={{ zIndex: 3000, width: '90%', maxWidth: '400px' }}>
      <div className={`card border-2 rounded-4 shadow-lg animate-slide-down ${rarityStyles[activeToast.rarity || 'common']}`}>
        <div className="card-body p-3 d-flex align-items-center">
          <div className={`rounded-circle bg-${activeToast.color || 'primary'} bg-opacity-20 p-2 me-3 text-${activeToast.color || 'primary'}`}>
            <i className={`bi ${activeToast.icon || 'bi-info-circle'} fs-4`}></i>
          </div>
          <div className="flex-grow-1 overflow-hidden">
            <h6 className="fw-bold mb-0 text-truncate">{activeToast.title}</h6>
            <p className="small text-muted mb-0 text-truncate">{activeToast.message}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Toast;
