import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Button } from '../components/Button';

export function SessionExpired() {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const handleLogin = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-4">
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-primary-fixed opacity-20 blur-[100px] rounded-full"></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] bg-secondary-fixed opacity-10 blur-[120px] rounded-full"></div>
      </div>

      <div className="relative z-10 bg-surface-container-lowest rounded-2xl border border-outline-variant shadow-2xl max-w-md w-full p-8 text-center">
        <div className="w-20 h-20 rounded-full bg-error/10 text-error flex items-center justify-center mx-auto mb-6">
          <span className="material-symbols-outlined text-5xl">schedule</span>
        </div>
        
        <h1 className="font-headline-lg text-headline-lg text-on-surface mb-2">
          Session Expired
        </h1>
        
        <p className="font-body-md text-body-md text-on-surface-variant mb-2">
          Your session has expired due to inactivity.
        </p>
        
        <p className="font-body-md text-body-md text-on-surface-variant mb-8">
          For security reasons, please log in again to continue.
        </p>

        <div className="bg-error/10 rounded-xl p-4 mb-8 border border-error/20">
          <p className="font-label-md text-label-md text-error">
            Session expired at {new Date().toLocaleTimeString()}
          </p>
        </div>

        <Button
          onClick={handleLogin}
          variant="primary"
          size="lg"
          className="w-full"
        >
          <span className="material-symbols-outlined">login</span>
          Login Again
        </Button>
      </div>
    </div>
  );
}

export default SessionExpired
