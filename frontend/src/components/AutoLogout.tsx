import React, { useState, useEffect, useCallback, useRef } from 'react';
import { AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

const INACTIVITY_LIMIT = 30 * 60 * 1000; // 30 minutes in milliseconds
const WARNING_DURATION = 60 * 1000; // 60 seconds

export function AutoLogout() {
  const [showWarning, setShowWarning] = useState(false);
  const [countdown, setCountdown] = useState(WARNING_DURATION / 1000);
  const lastActivityRef = useRef(Date.now());
  const warningIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const resetActivity = useCallback(() => {
    if (!showWarning) {
      lastActivityRef.current = Date.now();
    }
  }, [showWarning]);

  const stayLoggedIn = () => {
    setShowWarning(false);
    lastActivityRef.current = Date.now();
    setCountdown(WARNING_DURATION / 1000);
    if (warningIntervalRef.current) clearInterval(warningIntervalRef.current);
    toast.success('Session extended successfully.');
  };

  const logout = useCallback(() => {
    // Perform mock logout action
    toast.info('You have been logged out due to inactivity.');
    setTimeout(() => {
      window.location.reload();
    }, 1500);
  }, []);

  useEffect(() => {
    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
    events.forEach(event => window.addEventListener(event, resetActivity));

    const checkInactivity = setInterval(() => {
      if (showWarning) return;
      
      if (Date.now() - lastActivityRef.current >= INACTIVITY_LIMIT) {
        setShowWarning(true);
      }
    }, 1000);

    return () => {
      events.forEach(event => window.removeEventListener(event, resetActivity));
      clearInterval(checkInactivity);
    };
  }, [resetActivity, showWarning]);

  useEffect(() => {
    if (showWarning) {
      setCountdown(WARNING_DURATION / 1000);
      warningIntervalRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            logout();
            if (warningIntervalRef.current) clearInterval(warningIntervalRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (warningIntervalRef.current) clearInterval(warningIntervalRef.current);
    }

    return () => {
      if (warningIntervalRef.current) clearInterval(warningIntervalRef.current);
    };
  }, [showWarning, logout]);

  if (!showWarning) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
        <div className="p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center shrink-0">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">Inactivity Timeout</h2>
              <p className="text-slate-600 text-sm mt-1">For your security, you will be automatically logged out due to inactivity.</p>
            </div>
          </div>
          
          <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 flex justify-center mb-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-slate-800 tabular-nums">
                {countdown}
              </div>
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-widest mt-1">Seconds Remaining</div>
            </div>
          </div>

          <div className="flex gap-3">
            <button 
              onClick={logout}
              className="flex-1 bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-lg font-semibold hover:bg-slate-50 transition-colors shadow-sm"
            >
              Log Out Now
            </button>
            <button 
              onClick={stayLoggedIn}
              className="flex-1 bg-blue-600 border border-blue-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-700 transition-colors shadow-sm"
            >
              Stay Logged In
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
