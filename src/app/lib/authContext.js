// Updated authContext.js with security improvements and fixed infinite loop
'use client'

import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { API_ENDPOINTS, apiRequest } from "@/app/utils/api"
import { sanitizeInput, validateInput } from '@/app/utils/security'

const AuthContext = createContext()

export const useAuth = () => {
    const context = useContext(AuthContext)
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider')
    }
    return context
}

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null)
    const [loading, setLoading] = useState(true)
    const [hasCheckedAuth, setHasCheckedAuth] = useState(false) // Prevent multiple checks

    const checkAuth = useCallback(async () => {
        // Prevent multiple simultaneous auth checks
        if (hasCheckedAuth && !loading) {
            return
        }

        try {
            setLoading(true)
            const response = await apiRequest(API_ENDPOINTS.auth.me)

            if (response.ok) {
                const userData = await response.json()
                setUser(userData)
            } else if (response.status === 401) {
                // Handle 401 gracefully - user is not authenticated
                setUser(null)
            } else {
                // Other errors
                console.error('Auth check failed with status:', response.status)
                setUser(null)
            }
        } catch (error) {
            console.error('Auth check failed:', error)
            setUser(null)
        } finally {
            setLoading(false)
            setHasCheckedAuth(true) // Mark as checked to prevent infinite loops
        }
    }, [hasCheckedAuth, loading])

    useEffect(() => {
        if (!hasCheckedAuth) {
            checkAuth()
        }
    }, [hasCheckedAuth, checkAuth])

    const login = async (email, password, courseCode) => {
        try {
            // Input validation and sanitization
            const sanitizedEmail = sanitizeInput(email?.trim())
            const sanitizedCourseCode = sanitizeInput(courseCode?.trim())
            
            if (!validateInput(sanitizedEmail, 254) || !validateInput(password, 128) || !validateInput(sanitizedCourseCode, 50)) {
                return {
                    success: false,
                    error: 'Invalid input provided'
                }
            }

            const response = await apiRequest(API_ENDPOINTS.auth.login, {
                method: 'POST',
                body: JSON.stringify({
                    email: sanitizedEmail,
                    password,
                    course_code: sanitizedCourseCode
                })
            })

            if (!response.ok) {
                const error = await response.json()
                return {
                    success: false,
                    error: error.detail || 'Login failed'
                }
            }

            const data = await response.json()
            
            // ✅ FIXED: After successful login, fetch user details from /api/me
            try {
                const userResponse = await apiRequest(API_ENDPOINTS.auth.me)
                if (userResponse.ok) {
                    const userData = await userResponse.json()
                    setUser(userData)
                } else {
                    // Fallback to data from login response if /api/me fails
                    setUser(data.user)
                }
            } catch (error) {
                console.error('Failed to fetch user details after login:', error)
                // Fallback to data from login response
                setUser(data.user)
            }
            
            setHasCheckedAuth(true)
            
            return {
                success: true,
                user: data.user
            }

        } catch (error) {
            console.error('Login error:', error)
            return {
                success: false,
                error: error.message || 'Network error. Please try again.'
            }
        }
    }

    const signup = async (email, password, userRole = 'student', courseCode) => {
        try {
            // Input validation and sanitization
            const sanitizedEmail = sanitizeInput(email?.trim())
            const sanitizedCourseCode = sanitizeInput(courseCode?.trim())
            
            if (!validateInput(sanitizedEmail, 254) || !validateInput(password, 128) || !validateInput(sanitizedCourseCode, 50)) {
                return {
                    success: false,
                    error: 'Invalid input provided'
                }
            }

            const response = await apiRequest(API_ENDPOINTS.auth.signup, {
                method: 'POST',
                body: JSON.stringify({
                    email: sanitizedEmail,
                    password,
                    user_role: userRole,
                    course_code: sanitizedCourseCode
                })
            })

            if (!response.ok) {
                const error = await response.json()
                return {
                    success: false,
                    error: error.detail || 'Signup failed'
                }
            }

            const data = await response.json()
            setUser(data.user)
            setHasCheckedAuth(true) // Mark as authenticated
            
            return {
                success: true,
                user: data.user
            }

        } catch (error) {
            console.error('Signup error:', error)
            return {
                success: false,
                error: error.message || 'Network error. Please try again.'
            }
        }
    }

    const logout = async () => {
        try {
            const response = await apiRequest(API_ENDPOINTS.auth.logout, {
                method: 'POST'
            })

            setUser(null)
            setHasCheckedAuth(true) // Keep as checked but with no user
            return { success: true }
        } catch (error) {
            console.error('Logout error:', error)
            setUser(null)
            setHasCheckedAuth(true)
            return { success: false, error: 'Logout may have failed on server' }
        }
    }

    const value = {
        user,
        loading,
        login,
        signup,
        logout,
        checkAuth
    }

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    )
}