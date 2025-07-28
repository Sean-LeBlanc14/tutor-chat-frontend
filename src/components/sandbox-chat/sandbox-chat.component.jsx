// Fixed sandbox-chat.component.jsx with proper backend API calls
'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/app/lib/authContext'
import { useRole } from '@/hooks/useRole'
import SearchBox from '../search-box/search-box.component'
import Spinner from '../spinner/spinner.component'
import SandboxManager from '../sandbox-manager/sandbox-manager.component'
import Sidebar from '../sidebar/sidebar.component'
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
            const response = await apiRequest(API_ENDPOINTS.sandbox.sessions(selectedEnv.id))

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

    // FIXED: Use API_ENDPOINTS instead of hardcoded URL
    const addMessageToActive = async (role, content) => {

        // Check if we have an active chat session
        if (!activeChatId) {
            console.error('No active chat session. Cannot save message.');
            return;
        }

        // Add message to local state immediately for better UX
        const newMessage = {
            id: crypto.randomUUID(),
            role,
            content,
            created_at: new Date().toISOString()
        };

        // Update local messages
        setChatLogs(prev =>
            prev.map(chat =>
                chat.id === activeChatId
                    ? { ...chat, messages: [...chat.messages, newMessage] }
                    : chat
            )
        );

        // FIXED: Use apiRequest with proper backend URL
        try {
            const response = await apiRequest(API_ENDPOINTS.sandbox.sessionMessages(activeChatId), {
                method: 'POST',
                body: JSON.stringify({
                    role: role,
                    content: content
                })
            });
            
            if (response.ok) {
                const result = await response.json();
                
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
                );
            } else {
                const errorData = await response.text();
                console.error('Backend error response:', errorData);
                
                try {
                    const jsonError = JSON.parse(errorData);
                    console.error('Parsed error:', jsonError);
                    
                    // Handle specific errors
                    if (jsonError.detail === 'Session not found') {
                        await startNewChat();
                    }
                } catch (e) {
                    console.error('Raw error text:', errorData);
                }
            }
            
        } catch (error) {
            console.error('Network error saving message:', error);
            console.error('Error type:', error.constructor.name);
            console.error('Error message:', error.message);
        }
    }

    const handleRenameSession = async (sessionId, newTitle) => {
        const sanitizedTitle = sanitizeInput(newTitle)
        if (!validateInput(sanitizedTitle, 100)) {
            alert('Title is invalid or too long')
            return
        }

        // Update local state immediately
        setChatLogs(prev =>
            prev.map(chat =>
                chat.id === sessionId ? { ...chat, title: sanitizedTitle } : chat
            )
        )

        // FIXED: Use proper endpoint for updating session
        try {
            const response = await apiRequest(`${API_ENDPOINTS.sandbox.createSession}/${sessionId}`, {
                method: 'PUT',
                body: JSON.stringify({ session_name: sanitizedTitle })
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

        // FIXED: Use proper endpoint for deleting session
        try {
            const response = await apiRequest(`${API_ENDPOINTS.sandbox.createSession}/${sessionId}`, {
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

        await addMessageToActive('user', userQuery)
        setLoading(true)
        setDisplayedText('')
        setHasAsked(true)
        setQuery('')

        try {
            // Enhanced payload with chat context for sandbox
            const payload = {
                question: userQuery,
                system_prompt: selectedEnv.system_prompt,
                temperature: selectedEnv.model_config?.temperature || 0.7,
                chat_id: activeChatId // Add chat context for memory
            }

            const response = await apiRequest(API_ENDPOINTS.chat.stream, {
                method: 'POST',
                body: JSON.stringify(payload),
                stream: true
            })

            if (!response.ok) {
                throw new Error('Failed to get response')
            }

            // Handle streaming response
            const reader = response.body.getReader()
            const decoder = new TextDecoder()
            let fullResponse = ''

            // Create assistant message that we'll update in real-time
            const assistantMessage = {
                id: crypto.randomUUID(),
                role: 'assistant',
                content: '',
                created_at: new Date().toISOString()
            }

            // Add empty assistant message to UI
            setChatLogs(prev =>
                prev.map(chat => {
                    if (chat.id !== activeChatId) return chat
                    return { ...chat, messages: [...chat.messages, assistantMessage] }
                })
            )

            setLoading(false) // Stop loading spinner, start streaming

            // Read stream
            while (true) {
                const { done, value } = await reader.read()
                if (done) break

                const chunk = decoder.decode(value)
                const lines = chunk.split('\n')

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const token = line.substring(6)
                        fullResponse += token

                        // Update assistant message in real-time
                        setChatLogs(prev =>
                            prev.map(chat => {
                                if (chat.id !== activeChatId) return chat
                                return {
                                    ...chat,
                                    messages: chat.messages.map(msg =>
                                        msg.id === assistantMessage.id
                                            ? { ...msg, content: fullResponse }
                                            : msg
                                    )
                                }
                            })
                        )

                        // Auto-scroll to bottom
                        if (chatHistoryRef.current) {
                            chatHistoryRef.current.scrollTop = chatHistoryRef.current.scrollHeight
                        }
                    }
                }
            }

            // If you have a function to save sandbox messages, add it here
            // await saveSandboxMessage(assistantMessage)

        } catch (error) {
            console.error('Error:', error)
            let errorMessage = 'Something went wrong.'
            
            if (error.message.includes('Too many requests')) {
                errorMessage = 'Too many requests. Please wait a moment and try again.'
            }
            
            await addMessageToActive('assistant', errorMessage)
        } finally {
            setLoading(false)
        }
    }

    /*
    useEffect(() => {
        if (!loading && messages.length > 0) {
            const last = messages[messages.length - 1]
            if (last.role !== 'assistant') return

            const fullText = last.content
            let currentText = ''
            setDisplayedText('')

            const baseSpeed = fullText.length > 500 ? 3 : 5
            let charIndex = 0

            const interval = setInterval(() => {
                charIndex += baseSpeed
                currentText = fullText.slice(0, charIndex)
                setDisplayedText(currentText)

                if (charIndex >= fullText.length) {
                    clearInterval(interval)
                    setDisplayedText(fullText)
                    if (chatHistoryRef.current) {
                        chatHistoryRef.current.scrollTop = chatHistoryRef.current.scrollHistory
                    }
                }
            }, 20)

            return () => clearInterval(interval)
        }
    }, [loading, messages])
    */

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
                            {messages.map((msg, index) => (
                                <div key={index} className="chat-line">
                                    <div className={`chat-bubble-wrapper ${msg.role}`}>
                                        <div className={`chat-message ${msg.role}`}>
                                            {msg.role === 'assistant' && index === messages.length - 1 && !loading ? (
                                                <>
                                                    {displayedText}
                                                    <span className="blinking-cursor"></span>
                                                </>
                                            ) : msg.content}
                                        </div>
                                    </div>
                                </div>
                            ))}
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