'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/app/lib/authContext'
import './signup-page.styles.css'
import Link from 'next/link'

const SignupPage = () => {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [courseCode, setCourseCode] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)
    const router = useRouter()
    const { signup } = useAuth()

    const handleSubmit = async (event) => {
        event.preventDefault()
        setLoading(true)
        setError('')

        // Basic validation (backend will handle detailed validation)
        if (!email) {
            setError('Email is required')
            setLoading(false)
            return
        }

        if (!password) {
            setError('Password is required')
            setLoading(false)
            return
        }

        if (!courseCode.trim()) {
            setError('Course code is required')
            setLoading(false)
            return
        }

        try {
            // Use the signup function from auth context
            // Backend now handles all validation including course code
            const result = await signup(email, password, 'student', courseCode.trim())
            
            if (result.success) {
                router.push('/')
            } else {
                // Standardized error handling
                let errorMessage = 'Signup failed'
                
                if (typeof result.error === 'string') {
                    errorMessage = result.error
                } else if (result.error && typeof result.error === 'object') {
                    if (result.error.detail) {
                        errorMessage = result.error.detail
                    } else if (result.error.message) {
                        errorMessage = result.error.message
                    }
                }
                
                setError(errorMessage)
            }
        } catch (error) {
            console.error('Signup error:', error)
            setError('Signup failed. Please try again.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className='auth-container'>
            <div className='auth-card'>
                <div className='auth-header'>
                    <h1 className='auth-title'>Create Account</h1>
                    <p className='auth-subtitle'>Join your psychology course and start learning</p>
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
                            placeholder='Create a secure password'
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
                                Creating Account...
                            </>
                        ) : (
                            'Create Account'
                        )}
                    </button>
                </form>

                <div className='auth-footer'>
                    <p className='auth-link-text'>
                        Already have an account?{' '}
                        <Link href='/login' className='auth-link'>
                            Sign in here
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    )
}

export default SignupPage