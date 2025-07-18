'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/app/lib/authContext'
import './login-page.styles.css'
import Link from 'next/link'

const LoginPage = () => {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [courseCode, setCourseCode] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)
    const router = useRouter()
    const { login } = useAuth()

    const handleSubmit = async (event) => {
        event.preventDefault()
        setLoading(true)
        setError('')

        // Basic email validation (backend will handle @csub.edu validation)
        if (!email) {
            setError('Email is required')
            setLoading(false)
            return
        }

        // Basic course code validation (backend will handle specific validation)
        if (!courseCode.trim()) {
            setError('Course code is required')
            setLoading(false)
            return
        }

        try {
            // Use the login function from auth context with course code
            const result = await login(email, password, courseCode.trim())
            
            if (result.success) {
                router.push('/')
            } else {
                setError(result.error || 'Login failed')
            }
        } catch (error) {
            console.error('Login error:', error)
            setError('Login failed. Please try again.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className='auth-container'>
            <div className='auth-card'>
                <div className='auth-header'>
                    <h1 className='auth-title'>Welcome Back</h1>
                    <p className='auth-subtitle'>Sign in to continue to your psychology tutor</p>
                </div>

                <form onSubmit={handleSubmit} className='auth-form'>
                    {error && (
                        <div className='error-message'>
                            <span className='error-icon'>⚠️</span>
                            {error}
                        </div>
                    )}

                    <div className='form-group'>
                        <label className='form-label' htmlFor='email'>Email Address</label>
                        <input
                            id='email'
                            type='email'
                            placeholder='your.email@csub.edu'
                            value={email}
                            onChange={(event) => setEmail(event.target.value)}
                            className='form-input'
                            required
                            disabled={loading}
                        />
                    </div>

                    <div className='form-group'>
                        <label className='form-label' htmlFor='password'>Password</label>
                        <input
                            id='password'
                            type='password'
                            placeholder='Enter your password'
                            value={password}
                            onChange={(event) => setPassword(event.target.value)}
                            className='form-input'
                            required
                            disabled={loading}
                        />
                    </div>

                    <div className='form-group'>
                        <label className='form-label' htmlFor='courseCode'>Course Code</label>
                        <input
                            id='courseCode'
                            type='text'
                            placeholder='Enter course code'
                            value={courseCode}
                            onChange={(event) => setCourseCode(event.target.value)}
                            className='form-input'
                            required
                            disabled={loading}
                        />
                    </div>

                    <button 
                        type='submit' 
                        className={`auth-button ${loading ? 'loading' : ''}`}
                        disabled={loading}
                    >
                        {loading ? (
                            <>
                                <span className='loading-spinner'></span>
                                Signing in...
                            </>
                        ) : (
                            'Sign In'
                        )}
                    </button>
                </form>

                <div className='auth-footer'>
                    <p className='auth-link-text'>
                        Don&apos;t have an account?{' '}
                        <Link href='/signup' className='auth-link'>
                            Sign up here
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    )
}

export default LoginPage