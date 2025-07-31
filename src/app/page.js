// Fixed page.js with direct DOM streaming
"use client"
import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import * as ReactDOM from 'react-dom'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/app/lib/authContext'
import { useRole } from '@/hooks/useRole'
import SearchBox from '@/components/search-box/search-box.component'
import Spinner from '@/components/spinner/spinner.component'
import Sidebar from '@/components/sidebar/sidebar.component'
import { API_ENDPOINTS, apiRequest } from '@/app/utils/api'
import { sanitizeInput, validateInput } from '@/app/utils/security'

const HomePage = () => {
  const { user } = useAuth()
  const { isAdmin, loading: roleLoading } = useRole()
  const router = useRouter()

  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [hasAsked, setHasAsked] = useState(false)
  const [displayedText, setDisplayedText] = useState('')
  const [chatLogs, setChatLogs] = useState([])
  const [activeChatId, setActiveChatId] = useState(null)
  const [chatsLoaded, setChatsLoaded] = useState(false)

  const chatHistoryRef = useRef(null)
  const streamingContentRef = useRef('')

  const activeChat = useMemo(() => 
    chatLogs.find(chat => chat.id === activeChatId), 
    [chatLogs, activeChatId]
  )
  
  const messages = useMemo(() => 
    activeChat?.messages || [], 
    [activeChat?.messages]
  )

  const handleInputChange = (event) => {
    setQuery(event.target.value)
  }

  // Enhanced title generation with better context awareness
  const generateChatTitle = (message) => {
    let title = message.trim()
    
    // Remove common question words and clean up
    title = title.replace(/^(what|how|why|when|where|who|can|could|would|should|is|are|do|does|did|tell me about|explain)\s+/i, '')
    
    // Take first 30 characters and find a good breaking point
    if (title.length > 30) {
      const truncated = title.substring(0, 30)
      const lastSpace = truncated.lastIndexOf(' ')
      title = lastSpace > 15 ? truncated.substring(0, lastSpace) : truncated
    }
    
    title = title.replace(/[.!?]*$/, '')
    title = title.charAt(0).toUpperCase() + title.slice(1)
    
    if (title.length < 3) {
      title = 'New Chat'
    }
    
    return title
  }
  
  const handleFormSubmit = async (event) => {
    event.preventDefault()
    if (!query.trim()) return

    const userQuery = sanitizeInput(query.trim())
    
    if (!validateInput(userQuery, 5000)) {
      alert('Message is too long or contains invalid characters')
      return
    }

    addMessageToActive('user', userQuery)
    setLoading(true)
    setDisplayedText('')
    setHasAsked(true)
    setQuery('')

    try {
      const payload = {
        question: userQuery,
        chat_id: activeChatId,
        temperature: 0.7
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
      
      // Reset streaming content ref
      streamingContentRef.current = ''

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

      // Read stream with throttled updates
      let lastUpdateTime = 0
      const UPDATE_INTERVAL = 10  // Reduced from 50ms to 10ms

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value)
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const token = line.substring(6)
            
            // Update ref immediately
            streamingContentRef.current += token

            // Force React to render each update immediately
            ReactDOM.flushSync(() => {
              setChatLogs(prev => {
                return prev.map(chat => {
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
              })
            })

            // Auto-scroll
            if (chatHistoryRef.current) {
              chatHistoryRef.current.scrollTop = chatHistoryRef.current.scrollHeight
            }
          }
        }
      }

      // Final update to ensure all content is shown
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

      // Save final assistant message to backend
      if (user?.email && activeChatId && streamingContentRef.current) {
        try {
          await apiRequest(API_ENDPOINTS.chat.messages(activeChatId), {
            method: 'POST',
            body: JSON.stringify({
              user_email: user.email,
              role: 'assistant',
              content: streamingContentRef.current
            })
          })
        } catch (error) {
          console.error('Error saving assistant message:', error)
        }
      }

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

  // Create new chat locally - backend will handle it when first message is sent
  const startNewChat = useCallback(() => {
    if (!user?.email) return

    // Create new chat locally - backend will create it when first message is sent
    const newChatId = crypto.randomUUID()
    const newChat = {
      id: newChatId,
      title: '', // Will be auto-generated from first message
      messages: [],
      created_at: new Date().toISOString()
    }

    setChatLogs(prev => [newChat, ...prev])
    setActiveChatId(newChatId)
    setHasAsked(false)
  }, [user?.email])

  const handleSelectChat = (chatId) => {
    setActiveChatId(chatId)
    const selectedChat = chatLogs.find(chat => chat.id === chatId)
    setHasAsked(selectedChat?.messages.length > 0)
  }

  const addMessageToActive = async (role, content) => {
    // Create message with proper ID and timestamp
    const newMessage = {
      id: crypto.randomUUID(),
      role,
      content: sanitizeInput(content),
      created_at: new Date().toISOString()
    }

    // Find current chat and determine if this is the first user message
    const currentChat = chatLogs.find(chat => chat.id === activeChatId)
    const isFirstUserMessage = currentChat && role === 'user' && currentChat.messages.length === 0
    
    // Generate title for first user message
    let newTitle = currentChat?.title || ''
    if (isFirstUserMessage) {
      newTitle = generateChatTitle(content)
    }

    // Update local state immediately for responsive UI
    setChatLogs(prev =>
      prev.map(chat => {
        if (chat.id !== activeChatId) return chat

        const newMessages = [...chat.messages, newMessage]
        
        return { 
          ...chat, 
          title: isFirstUserMessage ? newTitle : chat.title,
          messages: newMessages 
        }
      })
    )

    // Save to backend
    if (user?.email && activeChatId) {
      try {
        
        const response = await apiRequest(API_ENDPOINTS.chat.messages(activeChatId), {
          method: 'POST',
          body: JSON.stringify({
            user_email: user.email,
            role,
            content: newMessage.content
          })
        })

        if (!response.ok) {
          const errorText = await response.text()
          console.error('Failed to save message to backend:', errorText)
        } else {
          
          // Save title if this was the first user message
          if (isFirstUserMessage && newTitle) {
            const titleSaved = await updateChatTitleInBackend(activeChatId, newTitle)
            if (!titleSaved) {
              console.error('Failed to save chat title')
            }
          }
        }

      } catch (error) {
        console.error('Error saving message:', error)
      }
    }
  }

  const updateChatTitleInBackend = async (chatId, title) => {
    try {
      const response = await apiRequest(API_ENDPOINTS.chat.updateChat(chatId), {
        method: 'PUT',
        body: JSON.stringify({ 
          title: sanitizeInput(title)
        })
      })

      if (response.ok) {
        return true
      } else {
        const errorText = await response.text()
        console.error('Failed to update chat title:', errorText)
        return false
      }
    } catch (error) {
      console.error('Error updating chat title:', error)
      return false
    }
  }

  // Load chats when user changes
  useEffect(() => {
    const loadChatsFromBackend = async () => {
      if (!user?.email) {
        setChatsLoaded(false)
        return
      }

      try {
        const response = await apiRequest(API_ENDPOINTS.chat.chats(user.email))

        if (!response.ok) {
          if (response.status === 401) {
            router.push('/login')
            return
          }
          throw new Error('Failed to load chats')
        }

        const chats = await response.json()
        
        // Process chats to ensure proper structure
        const processedChats = chats.map(chat => ({
          ...chat,
          title: chat.title || 'New Chat', // Fallback title
          messages: chat.messages || []
        }))
        
        setChatLogs(processedChats)
        
        if (processedChats.length > 0) {
          const mostRecentChat = processedChats[0]
          setActiveChatId(mostRecentChat.id)
          setHasAsked(mostRecentChat.messages.length > 0)
        } else {
          setActiveChatId(null)
          setHasAsked(false)
        }
        
        setChatsLoaded(true)

      } catch (error) {
        console.error('Error loading chats:', error)
        setChatLogs([])
        setActiveChatId(null)
        setHasAsked(false)
        setChatsLoaded(true)
      }
    }

    loadChatsFromBackend()
  }, [user?.email, router])

  // Auto-create new chat if no chats exist after loading
  useEffect(() => {
    if (chatsLoaded && user?.email && chatLogs.length === 0) {
      startNewChat()
    }
  }, [chatsLoaded, user?.email, chatLogs.length, startNewChat])

  const handleRenameChat = async (chatId, newTitle) => {
    const sanitizedTitle = sanitizeInput(newTitle)
    if (!validateInput(sanitizedTitle, 100)) {
      alert('Title is invalid or too long')
      return
    }

    const originalTitle = chatLogs.find(chat => chat.id === chatId)?.title

    // Update local state immediately
    setChatLogs(prev =>
      prev.map(chat =>
        chat.id === chatId ? { ...chat, title: sanitizedTitle } : chat
      )
    )

    // Update backend
    try {
      const success = await updateChatTitleInBackend(chatId, sanitizedTitle)
      if (!success) {
        // Rollback on failure
        setChatLogs(prev =>
          prev.map(chat =>
            chat.id === chatId ? { ...chat, title: originalTitle } : chat
          )
        )
      }
    } catch (error) {
      // Rollback on error
      setChatLogs(prev =>
        prev.map(chat =>
          chat.id === chatId ? { ...chat, title: originalTitle } : chat
        )
      )
      console.error('Error updating chat title:', error)
    }
  }

  const handleDeleteChat = async (chatId) => {
    // Update local state immediately
    setChatLogs(prev => {
      const updated = prev.filter(chat => chat.id !== chatId)

      if (chatId === activeChatId) {
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

    // Delete from backend
    if (user?.email) {
      try {
        const response = await apiRequest(API_ENDPOINTS.chat.deleteChat(chatId, user.email), {
          method: 'DELETE'
        })

        if (!response.ok) {
          console.error('Failed to delete chat from backend')
        }
      } catch (error) {
        console.error('Error deleting chat:', error)
      }
    }
  }

  // Redirect to login if user is null
  useEffect(() => {
    if (user === null) {
      router.push('/login')
    }
  }, [user, router])

  // Show loading state while chats are being loaded
  if (user && !chatsLoaded) {
    return (
      <div className="loading-container">
        <Spinner />
        <p>Loading your chats...</p>
      </div>
    )
  }

  return (
    <div className='app-layout'>
      <Sidebar
        chatLogs={chatLogs}
        activeChatId={activeChatId}
        onNewChat={startNewChat}
        onSelectChat={handleSelectChat}
        onRenameChat={handleRenameChat}
        onDeleteChat={handleDeleteChat}
        isAdmin={isAdmin}
      />

      <div className={`HomePage ${hasAsked ? 'has-asked' : 'initial'}`}>
        {chatLogs.length === 0 && chatsLoaded ? (
          <div className="empty-state">
            <h1>No Chats Yet</h1>
            <p>Would you like to start a new chat?</p>
          </div>
        ) : !hasAsked && (
          <>
            <h1 className="home-title">Welcome to Tutor Chatbot</h1>
            <p className="home-description">Ask a psychology question to get started.</p>
          </>
        )}

        {hasAsked && (
          <div className="chat-history" ref={chatHistoryRef}>
            {messages.map((msg, index) => (
              <div key={index} className='chat-line'>
                <div className={`chat-bubble-wrapper ${msg.role}`}>
                  <div 
                    className={`chat-message ${msg.role}`}
                  >
                    {msg.content}
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
                "Ask a follow-up question or something new..." : 
                "Enter a psychology question"
              }
            />
          </div>
        )}
      </div>
    </div>
  )
}

export default HomePage