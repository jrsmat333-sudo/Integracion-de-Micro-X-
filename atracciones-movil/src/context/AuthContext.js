import React, { createContext, useState, useContext, useEffect } from 'react';
import { getCurrentUser, getToken, removeToken, smartLogin, registerCliente } from '../services/api';

const AuthContext = createContext();

export const useAuth = () => {
  return useContext(AuthContext);
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setTokenState] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    restoreSession();
  }, []);

  const restoreSession = async () => {
    try {
      const storedToken = await getToken();
      const storedUser = await getCurrentUser();
      
      if (storedToken && storedUser) {
        setTokenState(storedToken);
        setUser(storedUser);
      }
    } catch (error) {
      console.error('Error restoring session:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email, password) => {
    setIsLoading(true);
    try {
      const u = await smartLogin(email, password);
      setUser(u);
      setTokenState(await getToken());
      return u;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (data) => {
    setIsLoading(true);
    try {
      const u = await registerCliente(data);
      setUser(u);
      setTokenState(await getToken());
      return u;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await removeToken();
      setUser(null);
      setTokenState(null);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      token,
      isLoading,
      isAuthenticated: !!user && !!token,
      login,
      register,
      logout,
      restoreSession
    }}>
      {children}
    </AuthContext.Provider>
  );
};
