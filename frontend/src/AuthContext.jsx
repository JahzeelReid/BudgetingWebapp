import React, { createContext, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  // Initialize state directly from localStorage so it's ready on page load
  const [token, setToken] = useState(() => localStorage.getItem("token"));
  const [user, setUser] = useState(null);

  // Sync state with localStorage whenever the token changes
  useEffect(() => {
    if (token) {
      localStorage.setItem("token", token);
    } else {
      localStorage.removeItem("token");
    }
  }, [token]);

  const login = (newToken, userData) => {
    setToken(newToken);
    setUser(userData);
  };

  const logout = () => {
    setToken(null);
    setUser(null);
  };

  const navigate = useNavigate();

  useEffect(() => {
    // This 'interceptor' watches every response coming back from Flask
    const interceptor = axios.interceptors.response.use(
      (response) => response, // If the request succeeds, just return it
      (error) => {
        if (error.response?.status === 401) {
          // Token is expired or invalid!
          logout(); // Clears localStorage and state
          navigate("/");
        }
        return Promise.reject(error);
      },
    );

    // Clean up the interceptor when the component unmounts
    return () => axios.interceptors.response.eject(interceptor);
  }, [navigate]);

  return (
    <AuthContext.Provider
      value={{ token, user, login, logout, isAuthenticated: !!token }}
    >
      {children}
    </AuthContext.Provider>
  );
};
