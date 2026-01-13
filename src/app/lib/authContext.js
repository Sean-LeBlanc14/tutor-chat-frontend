"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { API_ENDPOINTS, apiRequest } from "@/app/utils/api";
import { sanitizeInput, validateInput } from "@/app/utils/security";

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

// Optional hardcoded login (what you already had)
const HARDCODED_USER = {
  email: "test@csub.edu",
  user_role: "student", // useRole.js expects user.user_role
  courseCode: "PSYC101",
};
const HARDCODED_PASSWORD = "password123";

// DEV bypass (recommended)
const BYPASS_AUTH = process.env.NEXT_PUBLIC_BYPASS_AUTH === "true";
const BYPASS_ROLE = process.env.NEXT_PUBLIC_BYPASS_AUTH_ROLE || "admin";

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    if (BYPASS_AUTH) {
      return {
        email: "dev@local.test",
        user_role: BYPASS_ROLE, // 'admin' or 'student'
      };
    }
    return null;
  });

  const [loading, setLoading] = useState(!BYPASS_AUTH);
  const [hasCheckedAuth, setHasCheckedAuth] = useState(BYPASS_AUTH);

  const checkAuth = useCallback(async () => {
    // In bypass mode, do nothing
    if (BYPASS_AUTH) return;

    // Prevent multiple simultaneous auth checks
    if (hasCheckedAuth && !loading) return;

    try {
      setLoading(true);
      const response = await apiRequest(API_ENDPOINTS.auth.me);

      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
      } else if (response.status === 401) {
        setUser(null);
      } else {
        console.error("Auth check failed with status:", response.status);
        setUser(null);
      }
    } catch (error) {
      console.error("Auth check failed:", error);
      setUser(null);
    } finally {
      setLoading(false);
      setHasCheckedAuth(true);
    }
  }, [hasCheckedAuth, loading]);

  useEffect(() => {
    if (!hasCheckedAuth) {
      checkAuth();
    }
  }, [hasCheckedAuth, checkAuth]);

  const login = async (email, password, courseCode) => {
    // In bypass mode, already logged in
    if (BYPASS_AUTH) {
      return { success: true, user };
    }

    setLoading(true);

    // Hardcoded local login (optional)
    if (
      email === HARDCODED_USER.email &&
      password === HARDCODED_PASSWORD &&
      courseCode === HARDCODED_USER.courseCode
    ) {
      setUser(HARDCODED_USER);
      setHasCheckedAuth(true);
      setLoading(false);
      return { success: true, user: HARDCODED_USER };
    }

    // Otherwise, fall back to server login if you have it
    // (If you don't have an endpoint, you can remove this block.)
    try {
      const sanitizedEmail = sanitizeInput(email?.trim());
      const sanitizedCourseCode = sanitizeInput(courseCode?.trim());

      if (
        !validateInput(sanitizedEmail, 254) ||
        !validateInput(password, 128) ||
        !validateInput(sanitizedCourseCode, 50)
      ) {
        setLoading(false);
        return { success: false, error: "Invalid input provided" };
      }

      const response = await apiRequest(API_ENDPOINTS.auth.login, {
        method: "POST",
        body: JSON.stringify({
          email: sanitizedEmail,
          password,
          course_code: sanitizedCourseCode,
        }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        setLoading(false);
        return { success: false, error: err.detail || "Login failed" };
      }

      const data = await response.json();
      setUser(data.user || data);
      setHasCheckedAuth(true);
      setLoading(false);
      return { success: true, user: data.user || data };
    } catch (error) {
      console.error("Login error:", error);
      setLoading(false);
      return { success: false, error: error.message || "Network error" };
    }
  };

  const signup = async (email, password, userRole = "student", courseCode) => {
    if (BYPASS_AUTH) {
      return { success: true, user };
    }

    try {
      const sanitizedEmail = sanitizeInput(email?.trim());
      const sanitizedCourseCode = sanitizeInput(courseCode?.trim());

      if (
        !validateInput(sanitizedEmail, 254) ||
        !validateInput(password, 128) ||
        !validateInput(sanitizedCourseCode, 50)
      ) {
        return { success: false, error: "Invalid input provided" };
      }

      const response = await apiRequest(API_ENDPOINTS.auth.signup, {
        method: "POST",
        body: JSON.stringify({
          email: sanitizedEmail,
          password,
          user_role: userRole,
          course_code: sanitizedCourseCode,
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        return { success: false, error: error.detail || "Signup failed" };
      }

      const data = await response.json();
      setUser(data.user);
      setHasCheckedAuth(true);
      return { success: true, user: data.user };
    } catch (error) {
      console.error("Signup error:", error);
      return {
        success: false,
        error: error.message || "Network error. Please try again.",
      };
    }
  };

  const logout = async () => {
    // In bypass mode, don't actually log out (or set user null if you want)
    if (BYPASS_AUTH) {
      console.log("DEV logout (noop)");
      return { success: true };
    }

    try {
      await apiRequest(API_ENDPOINTS.auth.logout, { method: "POST" });
      setUser(null);
      setHasCheckedAuth(true);
      return { success: true };
    } catch (error) {
      console.error("Logout error:", error);
      setUser(null);
      setHasCheckedAuth(true);
      return { success: false, error: "Logout may have failed on server" };
    }
  };

  const value = {
    user,
    loading,
    login,
    signup,
    logout,
    checkAuth,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
