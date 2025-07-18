'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/app/lib/authContext'

export const useRole = () => {
    const { user } = useAuth()
    const [role, setRole] = useState(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const getRole = async () => {
            if (!user) {
                setRole(null)
                setLoading(false)
                return
            }

            try {
                // The user role is already included in the user object from auth context
                // No need for an additional API call since we get it from /api/me
                const userRole = user.user_role || 'student'
                setRole(userRole)
            } catch (error) {
                console.error('Error in getRole:', error)
                setRole('student') // Default fallback
            } finally {
                setLoading(false)
            }
        }
        
        getRole()
    }, [user])

    return {
        role,
        loading,
        isAdmin: role === 'admin',
        isStudent: role === 'student'
    }
}