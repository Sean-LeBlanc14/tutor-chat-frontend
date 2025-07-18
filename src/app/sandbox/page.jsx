'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useRole } from '@/hooks/useRole'
import SandBoxChat from '@/components/sandbox-chat/sandbox-chat.component'


const SandBoxPage = () => {
    const { isAdmin, loading } = useRole()
    const router = useRouter()
    const [selectedEnv, setSelectedEnv] = useState(null)

    useEffect(() => {
        if (!loading && !isAdmin) {
            router.push('/')
        }
    }, [loading, isAdmin])

    if (loading || !isAdmin) return null

    return (
        <SandBoxChat environment={selectedEnv} />
    )
}

export default SandBoxPage