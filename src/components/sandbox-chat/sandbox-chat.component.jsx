// Fixed sandbox-chat.component.jsx - prevents message duplication
'use client'

import { useState, useEffect, useRef } from 'react'
import * as ReactDOM from 'react-dom'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/app/lib/authContext'
import { useRole } from '@/hooks/useRole'
import SearchBox from '../search-box/search-box.component'
import Spinner from '../spinner/spinner.component'
import SandboxManager from '../sandbox-manager/sandbox-manager.component'
import Sidebar from '../sidebar/sidebar.component'
import ChatMessage from '../chat-message/chat-message.component'
import { API_ENDPOINTS, apiRequest } from '@/app/utils/api'
import { sanitizeInput, validateInput } from '@/app/utils/security'

const SandBoxChat = () => {
    const { user } = useAuth()
    const { isAdmin, loading: roleLoading } = useRole()
    const router = useRouter()

    const [selectedEnv, setSelectedEnv] = useState()
    const [query, setQuery] = useState('')
    const [loading, setLoading] = useState(false)
    const [hasAsked, setHasAsked] = useState(false)
    const [chatLogs, setChatLogs] = useState([])
    const [activeChatId, setActiveChatId] = useState(null)
    const [streamingMessageId, setStreamingMessageId] = useState(null)

    const chatHistoryRef = useRef(null)
    const streamingContentRef = useRef('')

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
            const response = await apiRequest(API_ENDPOINTS.sandbox.sessions(selectedEnv.id))

            if (!response.ok) {
                throw new Error('Failed to load sandbox sessions')
            }

            const sessions = await response.json()
            console.log('Raw sessions from backend:', sessions) // Debug logging

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
            const response = await apiRequest(API_ENDPOINTS.sandbox.createSession, {
                method: 'POST',
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
            // Fallback to local chat creation
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

    const handleInputChange = (e) => {
        setQuery(e.target.value)
    }

    const addMessageToActive = async (role, content) => {
        const newMessage = {
            id: crypto.randomUUID(),
            role,
            content: sanitizeInput(content),
            created_at: new Date().toISOString()
        }

        setChatLogs(prev =>
            prev.map(chat => chat.id === activeChatId
                ? { ...chat, messages: [...chat.messages, newMessage] }
                : chat
            )
        )

        // Only save manually added messages (not streaming messages)
        if (user?.email && activeChatId && role !== 'streaming') {
            try {
                const response = await apiRequest(API_ENDPOINTS.sandbox.sessionMessages(activeChatId), {
                    method: 'POST',
                    body: JSON.stringify({
                        role: role,
                        content: newMessage.content
                    })
                })
                
                if (response.ok) {
                    const result = await response.json()
                    
                    // Update the message with the server-generated ID if needed
                    setChatLogs(prev =>
                        prev.map(chat =>
                            chat.id === activeChatId
                                ? {
                                    ...chat,
                                    messages: chat.messages.map(msg =>
                                        msg.id === newMessage.id ? { ...msg, id: result.id } : msg
                                    )
                                }
                                : chat
                        )
                    )
                } else {
                    const errorData = await response.text()
                    console.error('Backend error response:', errorData)
                }
                
            } catch (error) {
                console.error('Network error saving message:', error)
            }
        }
    }

    const handleRenameSession = async (sessionId, newTitle) => {
        const sanitizedTitle = sanitizeInput(newTitle)
        if (!validateInput(sanitizedTitle, 100)) {
            alert('Title is invalid or too long')
            return
        }

        const originalTitle = chatLogs.find(chat => chat.id === sessionId)?.title

        // Update local state immediately
        setChatLogs(prev =>
            prev.map(chat =>
                chat.id === sessionId ? { ...chat, title: sanitizedTitle } : chat
            )
        )

        try {
            const response = await apiRequest(API_ENDPOINTS.sandbox.updateSession(sessionId), {
                method: 'PUT',
                body: JSON.stringify({ session_name: sanitizedTitle })
            })

            if (!response.ok) {
                // Revert on failure
                setChatLogs(prev =>
                    prev.map(chat =>
                        chat.id === sessionId ? { ...chat, title: originalTitle } : chat
                    )
                )
                console.error('Failed to rename session')
            }
        } catch (error) {
            // Revert on error
            setChatLogs(prev =>
                prev.map(chat =>
                    chat.id === sessionId ? { ...chat, title: originalTitle } : chat
                )
            )
            console.error('Error renaming session:', error)
        }
    }

    const handleDeleteSession = async (sessionId) => {
        // Update local state immediately
        setChatLogs(prev => {
            const updated = prev.filter(chat => chat.id !== sessionId)

            if (sessionId === activeChatId) {
                if (updated.length > 0) {
                    setActiveChatId(updated[0].id)
                    setHasAsked(updated[0].messages.length > 0)
                } else {
                    setActiveChatId(null)
                    setHasAsked(false)
                }
            }
            return updated
        })

        try {
            const response = await apiRequest(API_ENDPOINTS.sandbox.deleteSession(sessionId), {
                method: 'DELETE'
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

        const userQuery = sanitizeInput(query.trim())
        
        if (!validateInput(userQuery, 5000)) {
            alert('Message is too long or contains invalid characters')
            return
        }

        // DON'T add user message here - let backend handle it through streaming
        setLoading(true)
        setHasAsked(true)
        setQuery('')

        try {
            const payload = {
                role: 'user',
                content: userQuery
            }

            const response = await apiRequest(API_ENDPOINTS.sandbox.chatStream(activeChatId), {
                method: 'POST',
                body: JSON.stringify(payload),
                stream: true
            })

            if (!response.ok) {
                throw new Error('Failed to get response')
            }

            // After successful request, create user message in UI
            // (backend has already saved it)
            const userMessage = {
                id: crypto.randomUUID(),
                role: 'user',
                content: userQuery,
                created_at: new Date().toISOString()
            }

            setChatLogs(prev =>
                prev.map(chat => chat.id === activeChatId
                    ? { ...chat, messages: [...chat.messages, userMessage] }
                    : chat
                )
            )

            const reader = response.body.getReader()
            const decoder = new TextDecoder()
            streamingContentRef.current = ''

            const assistantMessage = {
                id: crypto.randomUUID(),
                role: 'assistant',
                content: '',
                created_at: new Date().toISOString()
            }

            setChatLogs(prev =>
                prev.map(chat => chat.id === activeChatId
                    ? { ...chat, messages: [...chat.messages, assistantMessage] }
                    : chat
                )
            )
            setStreamingMessageId(assistantMessage.id)
            setLoading(false)

            // FIXED: Use the same SSE parsing logic as regular chat
            let buffer = ''
            let doneStreaming = false
            let debugCounter = 0

            while (true) {
                const { done, value } = await reader.read()
                if (done) break

                buffer += decoder.decode(value, { stream: true })

                // Split by SSE event boundary (blank line)
                const events = buffer.split('\n\n')
                buffer = events.pop() || ''

                for (const evt of events) {
                    const lines = evt.split('\n')

                    for (const line of lines) {
                        // Check if line starts with "data: "
                        if (line.startsWith('data: ')) {
                            // Extract everything after "data: "
                            const contentLine = line.substring(6)
                            
                            // Check for sentinel
                            if (contentLine === '[DONE]') {
                                doneStreaming = true
                                continue
                            }

                            // Handle empty data lines as newlines, or append content
                            if (contentLine === '') {
                                // Only add newline if the last character isn't already a newline
                                if (streamingContentRef.current && !streamingContentRef.current.endsWith('\n')) {
                                    streamingContentRef.current += '\n'
                                }
                            } else {
                                streamingContentRef.current += contentLine
                            }
                        }
                        // Handle completely empty lines (non-data lines)
                        else if (line === '') {
                            // Only add newline if the last character isn't already a newline
                            if (streamingContentRef.current && !streamingContentRef.current.endsWith('\n')) {
                                streamingContentRef.current += '\n'
                            }
                        }
                        // If line doesn't start with "data:", it might be a continuation
                        else if (line.trim() && !line.startsWith(':')) {
                            // Only add newline if content doesn't already end with one
                            if (streamingContentRef.current && !streamingContentRef.current.endsWith('\n')) {
                                streamingContentRef.current += '\n' + line
                            } else {
                                streamingContentRef.current += line
                            }
                        }
                    }

                    ReactDOM.flushSync(() => {
                        setChatLogs(prev =>
                            prev.map(chat => {
                                if (chat.id !== activeChatId) return chat
                                return {
                                    ...chat,
                                    messages: chat.messages.map(msg =>
                                        msg.id === assistantMessage.id
                                            ? { ...msg, content: streamingContentRef.current }
                                            : msg
                                    )
                                }
                            })
                        )
                    })

                    if (chatHistoryRef.current) {
                        chatHistoryRef.current.scrollTop = chatHistoryRef.current.scrollHeight
                    }

                    if (doneStreaming) break
                }

                if (doneStreaming) break
            }

            // Final update
            setChatLogs(prev =>
                prev.map(chat => {
                    if (chat.id !== activeChatId) return chat
                    return {
                        ...chat,
                        messages: chat.messages.map(msg =>
                            msg.id === assistantMessage.id
                                ? { ...msg, content: streamingContentRef.current }
                                : msg
                        )
                    }
                })
            )
            setStreamingMessageId(null)

            // No need to save assistant message here - backend already saved it during streaming

        } catch (error) {
            console.error('Error:', error)
            let errorMessage = 'Something went wrong.'
            
            if (error.message.includes('Too many requests')) {
                errorMessage = 'Too many requests. Please wait a moment and try again.'
            } else if (error.message.includes('Authentication')) {
                errorMessage = 'Please log in again.'
                router.push('/login')
                return
            }
            
            addMessageToActive('assistant', errorMessage)
        } finally {
            setLoading(false)
        }
    }

    if (roleLoading || !isAdmin) return null

    return (
        <div className="app-layout">
            {selectedEnv && (
                <Sidebar
                    chatLogs={chatLogs}
                    activeChatId={activeChatId}
                    onNewChat={startNewChat}
                    onSelectChat={(sessionId) => {
                        setActiveChatId(sessionId)
                        const selectedChat = chatLogs.find(chat => chat.id === sessionId)
                        setHasAsked(selectedChat?.messages.length > 0)
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
                            <h1>No Test Sessions Yet</h1>
                            <p>Start a new test session to try this environment.</p>
                        </div>
                    ) : !hasAsked && (
                        <>
                            <h1 className="home-title">Ready to Test</h1>
                            <p className="home-description">Ask a question to test your custom prompt.</p>
                        </>
                    )}

                    {hasAsked && (
                        <div className="chat-history" ref={chatHistoryRef}>
                            {messages.map((msg, index) => {
                                const userQuestion = msg.role === 'assistant' && index > 0
                                    ? messages[index - 1]?.content || ''
                                    : ''
                                return (
                                    <div key={msg.id || index} className='chat-line'>
                                        <div className={`chat-bubble-wrapper ${msg.role}`}>
                                            <ChatMessage
                                                message={msg}
                                                originalQuestion={userQuestion}
                                                isStreaming={msg.id === streamingMessageId}
                                            />
                                        </div>
                                    </div>
                                )
                            })}
                            {loading && (
                                <div className="chat-line">
                                    <div className="chat-bubble-wrapper assistant">
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
                                placeholder={messages.length > 0 ? 
                                    "Ask a follow-up question or test something new..." : 
                                    "Test your custom prompt..."
                                }
                            />
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}

export default SandBoxChat