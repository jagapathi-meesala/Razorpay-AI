import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

interface User {
  username: string;
  role: string;
}

interface AuthContextType {
  token: string | null;
  user: User | null;
  login: (token: string, username: string, role: string) => void;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Set default base URL for Axios (defaults to relative root for server proxying)
axios.defaults.baseURL = import.meta.env.VITE_API_URL || '';

// Load initial credentials from localStorage on page load/refresh
const getInitialAuth = () => {
  const savedToken = localStorage.getItem('rs_token');
  const savedUsername = localStorage.getItem('rs_username');
  const savedRole = localStorage.getItem('rs_role');

  if (savedToken && savedUsername) {
    axios.defaults.headers.common['Authorization'] = `Bearer ${savedToken}`;
    return {
      token: savedToken,
      user: { username: savedUsername, role: savedRole || 'ADMIN' }
    };
  }
  return { token: null, user: null };
};

const initialAuth = getInitialAuth();

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(initialAuth.token);
  const [user, setUser] = useState<User | null>(initialAuth.user);

  const login = (jwtToken: string, username: string, role: string) => {
    localStorage.setItem('rs_token', jwtToken);
    localStorage.setItem('rs_username', username);
    localStorage.setItem('rs_role', role);
    axios.defaults.headers.common['Authorization'] = `Bearer ${jwtToken}`;
    setUser({ username, role });
    setToken(jwtToken);
  };

  const logout = () => {
    localStorage.removeItem('rs_token');
    localStorage.removeItem('rs_username');
    localStorage.removeItem('rs_role');
    delete axios.defaults.headers.common['Authorization'];
    setUser(null);
    setToken(null);
  };

  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      // Verify token and fetch exact role from database
      axios.get('/api/auth/me')
        .then(res => {
          const { username, role } = res.data;
          setUser({ username, role });
          localStorage.setItem('rs_username', username);
          localStorage.setItem('rs_role', role);
        })
        .catch(err => {
          if (err.response && err.response.status === 401) {
            logout();
          }
        });
    }
  }, [token]);

  useEffect(() => {
    const interceptor = axios.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response && error.response.status === 401) {
          logout();
        }
        return Promise.reject(error);
      }
    );
    return () => {
      axios.interceptors.response.eject(interceptor);
    };
  }, []);

  return (
    <AuthContext.Provider value={{ token, user, login, logout, isAuthenticated: !!token }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
