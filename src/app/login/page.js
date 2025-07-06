'use client'

import { useState } from 'react'
import { supabase } from '../lib/supabaseClient.js'
import { useRouter } from 'next/navigation'
import './login-page.styles.css'
import Link from 'next/link'

const LoginPage = () => {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [courseCode, setCourseCode] = useState('')
    const [error, setError] = useState('')
    const router = useRouter()

    const handleSubmit = async (event) => {
        event.preventDefault()

        if (!email.endsWith('@csub.edu')) {
            setError('Email must be a @csub.edu address')
            return
        }

        const VALID_CODE = process.env.NEXT_PUBLIC_VALID_COURSE_CODE
        if (courseCode.trim() !== VALID_CODE) {
            setError('Invalid course code')
            return
        }

        const { data, error: signInError } = await supabase.auth.signInWithPassword({
            email,
            password
        })

        if (signInError) {
            setError(signInError.message)
        } else {
            router.push('/')
        }
    }

    return (
        <div className='login-container'>
            <h1>Login</h1>
            <form onSubmit={handleSubmit} className='login-form'>
                {error && <p className='error'>{error}</p>}

                <input
                    type='email'
                    placeholder='Email (@csub.edu)'
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    required
                />

                <input
                    type='password'
                    placeholder='Password (mocked for now)'
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    required
                />

                <input
                    type='text'
                    placeholder='Course Code'
                    value={courseCode}
                    onChange={(event) => setCourseCode(event.target.value)}
                    required
                />

                <button type='submit'>Log In</button>

                <p className='signup-link'>
                    Don't have an account? {' '}
                    <Link href='/signup' className='underline text-blue-500 hover:text-blue-400'>
                        Sign Up here
                    </Link>
                </p>
            </form>
        </div>
    )
}

export default LoginPage