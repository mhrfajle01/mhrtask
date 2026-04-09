import { useState, useEffect } from 'react';

const InstallApp = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handler = (e) => {
      // Prevent Chrome 67 and earlier from automatically showing the prompt
      e.preventDefault();
      // Stash the event so it can be triggered later.
      setDeferredPrompt(e);
      // Update UI notify the user they can install the PWA
      setIsVisible(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    // Show the prompt
    deferredPrompt.prompt();

    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      console.log('User accepted the install prompt');
    } else {
      console.log('User dismissed the install prompt');
    }

    // We've used the prompt, and can't use it again, throw it away
    setDeferredPrompt(null);
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="card mb-4 bg-primary text-white shadow-sm">
      <div className="card-body d-flex align-items-center justify-content-between py-3">
        <div>
          <h5 className="card-title mb-1 fw-bold">Install MHR Task</h5>
          <p className="card-text small mb-0">Install on your home screen for better experience.</p>
        </div>
        <button 
          className="btn btn-light btn-sm fw-bold px-4" 
          onClick={handleInstallClick}
        >
          Install
        </button>
      </div>
    </div>
  );
};

export default InstallApp;
