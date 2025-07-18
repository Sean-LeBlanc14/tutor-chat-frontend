'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/app/lib/authContext'
import { useRole } from '@/hooks/useRole'
import SearchBox from '../search-box/search-box.component'
import Spinner from '../spinner/spinner.component'
import SandboxManager from '../sandbox-manager/sandbox-manager.component'
import Sidebar from '../sidebar/sidebar.component'

const SandBoxChat = () => {
    const { user } = useAuth()
    const { isAdmin, loading: roleLoading } = useRole()
    const router = useRouter()

    const [selectedEnv, setSelectedEnv] = useState()
    const [query, setQuery] = useState('')
    const [loading, setLoading] = useState(false)
    const [hasAsked, setHasAsked] = useState(false)
    const [displayedText, setDisplayedText] = useState('')
    const [chatLogs, setChatLogs] = useState([])
    const [activeChatId, setActiveChatId] = useState(null)

    const chatHistoryRef = useRef(null)
    const activeChat = chatLogs.find(chat => chat.id === activeChatId)
    const messages = activeChat?.messages || []

    useEffect(() => {
        if (!roleLoading && !isAdmin) {
            router.push('/')
        }
    }, [roleLoading, isAdmin, router])

    useEffect(() => {
        if (user && selectedEnv) {
            loadSandboxChats()
        }
    }, [user, selectedEnv])

    const loadSandboxChats = async () => {
        try {
            const response = await fetch(`http://localhost:8080/api/sandbox/sessions/${selectedEnv.id}`, {
                method: 'GET',
                credentials: 'include'
            })

            if (!response.ok) {
                throw new Error('Failed to load sandbox sessions')
            }

            const sessions = await response.json()

            if (sessions.length > 0) {
                setChatLogs(sessions)
                setActiveChatId(sessions[0].id)
                setHasAsked(sessions[0].messages.length > 0)
            } else {
                await startNewChat()
            }
        } catch (error) {
            console.error('Error loading sandbox chats:', error)
            await startNewChat()
        }
    }

    const startNewChat = async () => {
        if (!selectedEnv || !user) return

        try {
            const response = await fetch('http://localhost:8080/api/sandbox/sessions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    environment_id: selectedEnv.id,
                    session_name: `Session ${new Date().toLocaleString()}`
                })
            })

            if (!response.ok) {
                throw new Error('Failed to create new session')
            }

            const data = await response.json()
            const newChatId = data.session_id

            const newChat = {
                id: newChatId,
                title: data.session_name,
                messages: [],
                created_at: new Date().toISOString()
            }

            setChatLogs(prev => [newChat, ...prev])
            setActiveChatId(newChatId)
            setHasAsked(false)

        } catch (error) {
            console.error('Error creating new chat:', error)
            // Fallback to local chat creation if API fails
            const newChat = {
                id: crypto.randomUUID(),
                title: `Session ${new Date().toLocaleString()}`,
                messages: [],
                created_at: new Date().toISOString()
            }
            setChatLogs(prev => [newChat, ...prev])
            setActiveChatId(newChat.id)
            setHasAsked(false)
        }
    }

    const handleInputChange = (e) => setQuery(e.target.value)

    const addMessageToActive = async (role, content) => {
        const newMessage = {
            id: crypto.randomUUID(),
            role,
            content
        }

        // Update local state immediately for responsive UI
        setChatLogs(prev =>
            prev.map(chat => {
                if (chat.id !== activeChatId) return chat

                const newMessages = [...chat.messages, newMessage]
                let title = chat.title

                // Only set title if it's empty AND this is the first user message
                if (!title && role === 'user' && chat.messages.length === 0) {
                    const trimmed = content.trim()
                    title = trimmed.slice(0, 30).replace(/[.!?]*$/, '')
                    title = title.charAt(0).toUpperCase() + title.slice(1)
                }

                return { ...chat, title, messages: newMessages }
            })
        )

        // Save to backend
        if (user && activeChatId) {
            try {
                const response = await fetch(`http://localhost:8080/api/sandbox/sessions/${activeChatId}/messages`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({
                        role,
                        content
                    })
                })

                if (!response.ok) {
                    console.error('Failed to save message to backend')
                }
            } catch (error) {
                console.error('Error saving sandbox message:', error)
            }
        }
    }

    const handleRenameSession = async (sessionId, newTitle) => {
        // Update local state immediately
        setChatLogs(prev =>
            prev.map(chat =>
                chat.id === sessionId ? { ...chat, title: newTitle } : chat
            )
        )

        // Update backend
        try {
            const response = await fetch(`http://localhost:8080/api/sandbox/sessions/${sessionId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ session_name: newTitle })
            })

            if (!response.ok) {
                console.error('Failed to rename session')
            }
        } catch (error) {
            console.error('Error renaming session:', error)
        }
    }

    const handleDeleteSession = async (sessionId) => {
        // Update local state immediately
        const updated = chatLogs.filter(chat => chat.id !== sessionId)

        if (sessionId === activeChatId) {
            if (updated.length > 0) {
                setActiveChatId(updated[0].id)
                setHasAsked(updated[0].messages.length > 0)
            } else {
                setActiveChatId(null)
                setHasAsked(false)
            }
        }

        setChatLogs(updated)

        // Delete from backend
        try {
            const response = await fetch(`http://localhost:8080/api/sandbox/sessions/${sessionId}`, {
                method: 'DELETE',
                credentials: 'include'
            })

            if (!response.ok) {
                console.error('Failed to delete session from backend')
            }
        } catch (error) {
            console.error('Error deleting session:', error)
        }
    }

    const handleFormSubmit = async (e) => {
        e.preventDefault()
        if (!query.trim()) return

        const userQuery = query
        addMessageToActive('user', userQuery)
        setLoading(true)
        setDisplayedText('')
        setHasAsked(true)
        setQuery('')

        try {
            // Use the updated chat endpoint with sandbox environment prompt
            const payload = {
                question: userQuery,
                system_prompt: selectedEnv.system_prompt,
                temperature: selectedEnv.model_config?.temperature || 0.7
            }

            const res = await fetch('http://localhost:8080/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            })

            const data = await res.json()
            addMessageToActive('bot', data.response)
        } catch (error) {
            console.error('Error:', error)
            addMessageToActive('bot', 'Something went wrong.')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        if (!loading && messages.length > 0) {
            const last = messages[messages.length - 1]
            if (last.role !== 'bot') return

            const fullText = last.content
            let currentText = ''
            setDisplayedText('')

            const interval = setInterval(() => {
                currentText = fullText.slice(0, currentText.length + 1)
                setDisplayedText(currentText)

                if (currentText.length >= fullText.length) {
                    clearInterval(interval)
                    if (chatHistoryRef.current) {
                        chatHistoryRef.current.scrollTop = chatHistoryRef.current.scrollHeight
                    }
                }
            }, 5)

            return () => clearInterval(interval)
        }
    }, [loading, messages])

    if (roleLoading || !isAdmin) return null

    return (
        <div className="app-layout">
            {selectedEnv && (
                <Sidebar
                    chatLogs={chatLogs} // here these are sandbox sessions
                    activeChatId={activeChatId}
                    onNewChat={startNewChat}
                    onSelectChat={(sessionId) => {
                        setActiveChatId(sessionId)
                        setHasAsked(true)
                    }}
                    onRenameChat={handleRenameSession} 
                    onDeleteChat={handleDeleteSession} 
                    isAdmin={isAdmin}
                    mode="sandbox"
                />
            )}
            {!selectedEnv ? (
                <SandboxManager
                    selectedEnvironment={selectedEnv}
                    onEnvironmentSelect={(env) => setSelectedEnv(env)}
                />
            ) : (
                <div className={`HomePage ${hasAsked ? 'has-asked' : 'initial'}`}>
                    <button
                        onClick={() => setSelectedEnv(null)}
                        className="btn btn-secondary"
                        style={{ marginBottom: '1rem' }}
                    >
                        ← Back to Environments
                    </button>
                    
                    {/* Show current environment details */}
                    <div className="environment-info-card">
                        <h3 className="environment-info-title">Testing Environment: {selectedEnv.name}</h3>
                        {selectedEnv.description && (
                            <p className="environment-info-description">{selectedEnv.description}</p>
                        )}
                        <details className="environment-prompt-details">
                            <summary className="environment-prompt-summary">
                                View System Prompt
                            </summary>
                            <div className="environment-prompt-content">
                                {selectedEnv.system_prompt}
                            </div>
                        </details>
                    </div>

                    {chatLogs.length === 0 ? (
                        <div className="empty-state">
                            <h1>No Chats Yet</h1>
                            <p>Start a new chat to test this environment.</p>
                        </div>
                    ) : !hasAsked && (
                        <>
                            <h1 className="home-title">Ready to Test</h1>
                            <p className="home-description">Ask a question to test your custom prompt.</p>
                        </>
                    )}

                    {hasAsked && (
                        <div className="chat-history" ref={chatHistoryRef}>
                            {messages.map((msg, index) => (
                                <div key={index} className="chat-line">
                                    <div className={`chat-bubble-wrapper ${msg.role}`}>
                                        <div className={`chat-message ${msg.role}`}>
                                            {msg.role === 'bot' && index === messages.length - 1 && !loading ? (
                                                <>
                                                    {displayedText}
                                                    <span className="blinking-cursor">|</span>
                                                </>
                                            ) : msg.content}
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {loading && (
                                <div className="chat-line">
                                    <div className="chat-bubble-wrapper bot">
                                        <div className="spinner-container">
                                            <Spinner />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {chatLogs.length > 0 && (
                        <div className={`chat-box-wrapper ${hasAsked ? 'fixed-bottom' : ''}`}>
                            <SearchBox
                                value={query}
                                onChange={handleInputChange}
                                onSubmit={handleFormSubmit}
                                className="chat-box"
                                placeholder="Test your custom prompt..."
                            />
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}

export default SandBoxChat