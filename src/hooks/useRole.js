'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/app/lib/authContext'
import { supabase } from '@/app/lib/supabaseClient'

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
                const { data, error } = await supabase
                    .from('users')
                    .select('user_role')
                    .eq('id', user.id)
                    .single()

                if (error) {
                    console.error('Error fetching user role:', error)
                    setRole('student')
                } else {
                    setRole(data?.user_role || 'student')
                }
            } catch (error) {
                console.error('Error in getRole:', error)
                setRole('student')
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