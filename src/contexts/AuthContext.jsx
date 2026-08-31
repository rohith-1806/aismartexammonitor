import React, { createContext, useState, useCallback, useEffect, useMemo } from 'react';
import { useAppData } from '../hooks/useAppData';
import { buildApiUrl } from '../config/api';

const SESSION_KEY = 'examguard_session';
const USER_KEY = 'examguard_user';
const TOKEN_KEY = 'examguard_token';
export const AuthContext = createContext();

function buildSession(user) {
  const loginTime = new Date().toISOString();
  const expiryTime = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  return {
    id: `SESSION-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
    loginTime,
    expiryTime,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatar: user.avatar || null
    }
  };
}


function buildAuthUser(candidate) {
  return {
    id: candidate?.id,
    name: candidate?.name,
    email: candidate?.email,
    role: candidate?.role || 'candidate',
    avatar: candidate?.photo_path || null,
    stats: {
      totalExams: 0,
      completedExams: 0,
      pendingExams: 0,
      averageScore: 0
    }
  };
}

export function AuthProvider({ children }) {
  const { addSessionEvent } = useAppData();
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [session, setSession] = useState(null);
  const [token, setToken] = useState(null);

  useEffect(() => {
    const storedUser = localStorage.getItem(USER_KEY);
    const storedSession = localStorage.getItem(SESSION_KEY);
    const storedToken = localStorage.getItem(TOKEN_KEY);

    if (storedUser && storedSession && storedToken) {
      try {
        const parsedUser = JSON.parse(storedUser);
        const parsedSession = JSON.parse(storedSession);
        const now = new Date();
        if (new Date(parsedSession.expiryTime) > now) {
          setUser(parsedUser);
          setSession(parsedSession);
          setToken(storedToken || null);
          setIsAuthenticated(true);
          setSessionExpired(false);
        } else {
          localStorage.removeItem(USER_KEY);
          localStorage.removeItem(SESSION_KEY);
          localStorage.removeItem(TOKEN_KEY);
          setSessionExpired(true);
        }
      } catch (error) {
        console.error('Error parsing auth state:', error);
      }
    } else if (storedUser || storedSession || storedToken) {
      localStorage.removeItem(USER_KEY);
      localStorage.removeItem(SESSION_KEY);
      localStorage.removeItem(TOKEN_KEY);
    }

    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (!session || !user || sessionExpired) return;
    const interval = setInterval(() => {
      const now = new Date();
      if (new Date(session.expiryTime) <= now) {
        setSessionExpired(true);
        setIsAuthenticated(false);
        localStorage.removeItem(USER_KEY);
        localStorage.removeItem(SESSION_KEY);
        localStorage.removeItem(TOKEN_KEY);
        setToken(null);
        if (typeof addSessionEvent === 'function') {
          addSessionEvent({
            event: 'Session Expired',
            status: 'Warning',
            sessionId: session.id,
            details: 'The user session expired due to inactivity.',
            score: null,
            exam: 'Session Expired'
          });
        }
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [session, user, sessionExpired, addSessionEvent]);

  const createSession = useCallback((userData, eventLabel = 'User Logged In', authToken = null) => {
    const sessionData = buildSession(userData);
    localStorage.setItem(SESSION_KEY, JSON.stringify(sessionData));
    localStorage.setItem(USER_KEY, JSON.stringify(userData));

    if (authToken) {
      localStorage.setItem(TOKEN_KEY, authToken);
      setToken(authToken);
    } else {
      localStorage.removeItem(TOKEN_KEY);
      setToken(null);
    }

    setSession(sessionData);
    setUser(userData);
    setIsAuthenticated(true);
    setSessionExpired(false);

    if (typeof addSessionEvent === 'function') {
      addSessionEvent({
        event: eventLabel,
        status: 'Info',
        sessionId: sessionData.id,
        details: `${userData.name} ${eventLabel.toLowerCase()}.`,
        score: null,
        exam: eventLabel
      });
    }

    return sessionData;
  }, [addSessionEvent]);

  const login = useCallback(async (email, password) => {
    try {
      const response = await fetch(buildApiUrl('/api/auth/login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await response.json();
      if (response.ok && data?.token) {
        const userData = buildAuthUser(data.candidate);
        createSession(userData, 'User Logged In', data.token);
        return true;
      }
      throw new Error(data?.error || 'Login failed.');
    } catch (error) {
      throw error;
    }
  }, [createSession]);

  const loginStaff = useCallback(async (staffId, password) => {
    const response = await fetch(buildApiUrl('/api/auth/staff-login'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ staff_id: staffId, password })
    });
    const data = await response.json();
    if (response.ok && data?.token) {
      const userData = buildAuthUser(data.candidate);
      createSession(userData, 'Staff Logged In', data.token);
      return true;
    }
    throw new Error(data?.error || 'Staff login failed.');
  }, [createSession]);

  const register = useCallback(async (email, password, fullName, photoDataUrl) => {
    try {
      const response = await fetch(buildApiUrl('/api/auth/register'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: fullName, email: email.toLowerCase(), password, photo_path: photoDataUrl || '' })
      });
      const data = await response.json();
      if (!response.ok) {
        return { error: data.error || 'Registration failed. Email may already be registered.' };
      }
      if (data?.token) {
        const userData = buildAuthUser(data.candidate);
        createSession(userData, 'User Registered', data.token);
        return { success: true };
      }
      return { error: 'Registration succeeded but no authentication token was returned.' };
    } catch (error) {
      return { error: 'Unable to reach the authentication server.' };
    }
  }, [createSession]);



  const logout = useCallback(() => {
    if (session && typeof addSessionEvent === 'function') {
      addSessionEvent({
        event: 'User Logged Out',
        status: 'Info',
        sessionId: session.id,
        details: `${session.user.name} logged out of the portal.`,
        score: null,
        exam: 'User Logout'
      });
    }
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(TOKEN_KEY);
    setUser(null);
    setSession(null);
    setToken(null);
    setIsAuthenticated(false);
    setSessionExpired(false);
  }, [addSessionEvent, session]);

  const updateProfile = useCallback((updates) => {
    setUser((prev) => {
      const next = {
        ...prev,
        ...updates
      };
      localStorage.setItem(USER_KEY, JSON.stringify(next));
      if (session) {
        const nextSession = {
          ...session,
          user: {
            ...session.user,
            ...updates
          }
        };
        localStorage.setItem(SESSION_KEY, JSON.stringify(nextSession));
        setSession(nextSession);
      }
      return next;
    });
  }, [session]);

  const refreshSessionExpiry = useCallback(() => {
    if (!session) return;
    const nextSession = {
      ...session,
      expiryTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    };
    localStorage.setItem(SESSION_KEY, JSON.stringify(nextSession));
    setSession(nextSession);
  }, [session]);


  const value = useMemo(() => ({
    user,
    session,
    token,
    isAuthenticated,
    isLoading,
    sessionExpired,
    login,
    loginStaff,
    register,
    logout,
    updateProfile,
    refreshSessionExpiry,
    createSession,
    setSessionExpired
  }), [user, session, token, isAuthenticated, isLoading, sessionExpired, login, loginStaff, register, logout, updateProfile, refreshSessionExpiry]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
