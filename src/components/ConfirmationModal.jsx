import { useState } from "react";

const ConfirmationModal = ({ title, message, onConfirm, onCancel, show, children, disabled }) => {
  if (!show) return null;
  return (
    <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 9999 }}>
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content border-0 rounded-4 shadow-lg p-4">
          <h5 className="fw-bold">{title}</h5>
          <p className="text-muted">{message}</p>
          {children}
          <div className="d-flex gap-2 mt-3">
            <button className="btn btn-outline-secondary flex-grow-1" onClick={onCancel}>Cancel</button>
            <button className="btn btn-danger flex-grow-1" onClick={onConfirm} disabled={disabled}>Confirm</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;
