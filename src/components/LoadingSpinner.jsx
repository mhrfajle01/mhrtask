import React from 'react';

const LoadingSpinner = () => {
  return (
    <div className="d-flex justify-content-center align-items-center vh-100 bg-light" style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', zIndex: 9999 }}>
      <div className="spinner-container text-center">
        <svg className="spinner-circle" width="65px" height="65px" viewBox="0 0 66 66" xmlns="http://www.w3.org/2000/svg">
          <circle className="path" fill="none" strokeWidth="6" strokeLinecap="round" cx="33" cy="33" r="30"></circle>
        </svg>
        <div className="mt-3 fw-bold text-primary animate-pulse" style={{ letterSpacing: '2px' }}>LOADING DATA...</div>
      </div>
      <style>{`
        .spinner-circle {
          animation: rotator 1.4s linear infinite;
        }

        @keyframes rotator {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(270deg); }
        }

        .path {
          stroke-dasharray: 187;
          stroke-dashoffset: 0;
          transform-origin: center;
          animation: dash 1.4s ease-in-out infinite, colors 5.6s ease-in-out infinite;
        }

        @keyframes colors {
          0% { stroke: #4285F4; }
          25% { stroke: #DE3E35; }
          50% { stroke: #F7C223; }
          75% { stroke: #1B9A59; }
          100% { stroke: #4285F4; }
        }

        @keyframes dash {
          0% { stroke-dashoffset: 187; }
          50% {
            stroke-dashoffset: 46.75;
            transform: rotate(135deg);
          }
          100% {
            stroke-dashoffset: 187;
            transform: rotate(450deg);
          }
        }
      `}</style>
    </div>
  );
};

export default LoadingSpinner;
