'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useRole } from '@/hooks/useRole'
import { useAuth } from '@/app/lib/authContext'
import SandboxManager from '@/components/sandbox-manager/sandbox-manager.component'


const SandBoxPage = () => {
    const { isAdmin, loading } = useRole()
    const router = useRouter()
    const { user } = useAuth()
    const [selectedEnv, setSelectedEnv] = useState(null)

    useEffect(() => {
        if (!loading && !isAdmin) {
            router.push('/')
        }
    }, [loading, isAdmin])

    if (loading || !isAdmin) return null

    return (
        <div className='app-layout'>
            {!selectedEnv ? (
                <SandboxManager
                    selectedEnvironment={selectedEnv}
                    onEnvironmentSelect={(env) => setSelectedEnv(env)}
                />
            ) : (
                <div className='HomePage'>
                    <h2>Sandbox Environment: {selectedEnv.name}</h2>
                    <p><strong>Prompt:</strong> {selectedEnv.system_prompt}</p>
                    <button
                        onClick={() => setSelectedEnv(null)}
                        className='btn btn-secondary'
                    >
                        ← Back to Environments
                    </button>
                </div>
            )}
        </div>
    )
}

export default SandBoxPage