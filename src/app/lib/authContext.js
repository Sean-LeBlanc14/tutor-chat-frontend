'use client'

import { createContext, useContext, useState, useEffect } from 'react'

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

    // Check if user is already logged in
    useEffect(() => {
        checkAuth()
    }, [])

    const checkAuth = async () => {
        try {
            const response = await fetch('http://localhost:8080/api/me', {
                method: 'GET',
                credentials: 'include'
            })

            if (response.ok) {
                const userData = await response.json()
                setUser(userData)
            } else {
                setUser(null)
            }
        } catch (error) {
            console.error('Auth check failed:', error)
            setUser(null)
        } finally {
            setLoading(false)
        }
    }

    const login = async (email, password, courseCode) => {
        try {
            console.log('Login attempt with:', { email, courseCode: courseCode ? 'provided' : 'missing' })
            
            const requestBody = {
                email: email.trim(),
                password,
                course_code: courseCode.trim()
            }
            
            console.log('Request body:', requestBody)
            
            const response = await fetch('http://localhost:8080/api/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify(requestBody)
            })

            console.log('Response status:', response.status)
            
            if (!response.ok) {
                const error = await response.json()
                console.log('Backend error response:', error)
                
                // Extract error message safely
                let errorMessage = 'Login failed'
                if (typeof error === 'string') {
                    errorMessage = error
                } else if (error && typeof error === 'object') {
                    if (typeof error.detail === 'string') {
                        errorMessage = error.detail
                    } else if (Array.isArray(error.detail)) {
                        errorMessage = error.detail[0]?.msg || 'Validation error'
                    } else if (error.message) {
                        errorMessage = error.message
                    }
                }
                
                return {
                    success: false,
                    error: String(errorMessage) // Ensure it's always a string
                }
            }

            const data = await response.json()
            setUser(data.user)
            
            return {
                success: true,
                user: data.user
            }

        } catch (error) {
            console.error('Login error:', error)
            return {
                success: false,
                error: 'Network error. Please try again.'
            }
        }
    }

    const signup = async (email, password, userRole = 'student', courseCode) => {
        try {
            const response = await fetch('http://localhost:8080/api/signup', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({
                    email,
                    password,
                    user_role: userRole,
                    course_code: courseCode // Include course code in request
                })
            })

            if (!response.ok) {
                const error = await response.json()
                console.log('Backend signup error response:', error)
                
                // Extract error message safely
                let errorMessage = 'Signup failed'
                if (typeof error === 'string') {
                    errorMessage = error
                } else if (error && typeof error === 'object') {
                    if (typeof error.detail === 'string') {
                        errorMessage = error.detail
                    } else if (Array.isArray(error.detail)) {
                        errorMessage = error.detail[0]?.msg || 'Validation error'
                    } else if (error.message) {
                        errorMessage = error.message
                    }
                }
                
                return {
                    success: false,
                    error: String(errorMessage) // Ensure it's always a string
                }
            }

            const data = await response.json()
            setUser(data.user)
            
            return {
                success: true,
                user: data.user
            }

        } catch (error) {
            console.error('Signup error:', error)
            return {
                success: false,
                error: 'Network error. Please try again.'
            }
        }
    }

    const logout = async () => {
        try {
            const response = await fetch('http://localhost:8080/api/logout', {
                method: 'POST',
                credentials: 'include'
            })

            if (response.ok) {
                setUser(null)
                return { success: true }
            } else {
                throw new Error('Logout failed')
            }
        } catch (error) {
            console.error('Logout error:', error)
            // Even if logout fails on server, clear user locally
            setUser(null)
            return { 
                success: false, 
                error: 'Logout may have failed on server, but you have been logged out locally' 
            }
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