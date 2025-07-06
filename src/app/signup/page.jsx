'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/app/lib/supabaseClient'
import './signup-page.styles.css'

const SignupPage = () => {
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

        const { error: signUpError } = await supabase.auth.signUp({
            email,
            password,
        })

        if (signUpError) {
            setError(signUpError.message)
        } else {
            router.push('/')
        }
    }

    return (
        <div className='signup-container'>
            <h1>Sign Up</h1>
            <form onSubmit={handleSubmit} className='signup-form'>
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
                    placeholder='Password'
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

                <button type='submit'>Sign Up</button>
            </form>
        </div>
    )
}

export default SignupPage