"use client"
import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/app/lib/authContext'
import { useRole } from '@/hooks/useRole'
import SearchBox from '@/components/search-box/search-box.component'
import Spinner from '@/components/spinner/spinner.component'
import Sidebar from '@/components/sidebar/sidebar.component'

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
  const [chatsLoaded, setChatsLoaded] = useState(false) // Track if chats have been loaded

  const chatHistoryRef = useRef(null)

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

  // Function to generate a chat title from the first message
  const generateChatTitle = (message) => {
    // Clean the message and extract key parts
    let title = message.trim()
    
    // Remove common question words and clean up
    title = title.replace(/^(what|how|why|when|where|who|can|could|would|should|is|are|do|does|did|tell me about|explain)\s+/i, '')
    
    // Take first 30 characters and find a good breaking point
    if (title.length > 30) {
      const truncated = title.substring(0, 30)
      const lastSpace = truncated.lastIndexOf(' ')
      title = lastSpace > 15 ? truncated.substring(0, lastSpace) : truncated
    }
    
    // Remove trailing punctuation
    title = title.replace(/[.!?]*$/, '')
    
    // Capitalize first letter
    title = title.charAt(0).toUpperCase() + title.slice(1)
    
    // Fallback if title is too short or empty
    if (title.length < 3) {
      title = 'New Chat'
    }
    
    return title
  }
  
  const handleFormSubmit = async (event) => {
    event.preventDefault()
    if (query.trim() === '') return

    const userQuery = query
    addMessageToActive('user', userQuery)
    setLoading(true)
    setDisplayedText('')
    setHasAsked(true)
    setQuery('')

    try {
      const res = await fetch('http://localhost:8080/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: userQuery }),
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
      const lastMessage = messages[messages.length - 1]
      if (lastMessage.role !== 'bot') return

      const fullText = lastMessage.content
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

  const startNewChat = useCallback(async () => {
    if (!user?.email) return

    try {
      const response = await fetch('http://localhost:8080/api/chats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ user_email: user.email })
      })

      if (!response.ok) {
        throw new Error('Failed to create new chat')
      }

      const data = await response.json()
      const newChatId = data.chat_id

      const newChat = {
        id: newChatId,
        title: '',
        messages: [],
        created_at: new Date().toISOString()
      }

      setChatLogs(prev => [newChat, ...prev])
      setActiveChatId(newChatId)
      setHasAsked(false)

    } catch (error) {
      console.error('Error creating new chat:', error)

      const newChat = {
        id: crypto.randomUUID(),
        title: '',
        messages: [],
        created_at: new Date().toISOString()
      }
      setChatLogs(prev => [newChat, ...prev])
      setActiveChatId(newChat.id)
      setHasAsked(false)
    }
  }, [user?.email])

  const handleSelectChat = (chatId) => {
    setActiveChatId(chatId)
    const selectedChat = chatLogs.find(chat => chat.id === chatId)
    setHasAsked(selectedChat?.messages.length > 0)
  }

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
              
              // Auto-generate title from first user message
              if (!title && role === 'user' && chat.messages.length === 0) {
                  title = generateChatTitle(content)
              }

              return { ...chat, title, messages: newMessages }
          })
      )

    // Save to backend
    if (user?.email && activeChatId) {
      try {
        const response = await fetch(`http://localhost:8080/api/chats/${activeChatId}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            user_email: user.email,
            role,
            content
          })
        })

        if (!response.ok) {
          console.error('Failed to save message to backend')
        }

        // Update title in backend if this is the first user message
        const chat = chatLogs.find(c => c.id === activeChatId)
        if (chat && chat.title && !chat.title.includes('New Chat') && role === 'user' && chat.messages.length === 1) {
          await updateChatTitleInBackend(activeChatId, chat.title)
        }

      } catch (error) {
        console.error('Error saving message:', error)
      }
    }
  }

  const updateChatTitleInBackend = async (chatId, title) => {
    try {
      console.log('Updating chat title:', { chatId, title }) // Debug log
      
      const response = await fetch(`http://localhost:8080/api/chats/${chatId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ 
          title,
          user_email: user?.email // Add user_email if backend requires it
        })
      })

      console.log('Update response status:', response.status) // Debug log

      if (!response.ok) {
        const errorData = await response.text()
        console.error('Failed to update chat title - Response:', errorData)
        return false
      }

      const responseData = await response.json()
      console.log('Update successful - Backend response:', responseData) // Debug log
      
      // Force a refresh of chat data to verify the update persisted
      setTimeout(() => {
        console.log('Verifying title update...')
        // Re-fetch the specific chat to verify it was updated
        fetch(`http://localhost:8080/api/chats/${encodeURIComponent(user.email)}`, {
          method: 'GET',
          credentials: 'include'
        })
        .then(res => res.json())
        .then(chats => {
          const updatedChat = chats.find(c => c.id === chatId)
          console.log('Chat after update:', updatedChat)
          if (updatedChat && updatedChat.title !== title) {
            console.error('Title update did not persist in database!')
          }
        })
      }, 1000)
      
      return true

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
        console.log('Loading chats for user:', user.email) // Debug log
        
        const response = await fetch(`http://localhost:8080/api/chats/${encodeURIComponent(user.email)}`, {
          method: 'GET',
          credentials: 'include'
        })

        if (!response.ok) {
          if (response.status === 401) {
            // User not authenticated, redirect to login
            router.push('/login')
            return
          }
          throw new Error('Failed to load chats')
        }

        const chats = await response.json()
        console.log('Loaded chats from backend:', chats) // Debug log - check if titles are correct here
        
        setChatLogs(chats)
        
        if (chats.length > 0) {
          // Set the most recent chat as active
          const mostRecentChat = chats[0]
          setActiveChatId(mostRecentChat.id)
          setHasAsked(mostRecentChat.messages.length > 0)
        } else {
          // No chats exist, we'll create one when needed
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
    // Store original title for rollback if needed
    const originalTitle = chatLogs.find(chat => chat.id === chatId)?.title

    // Update local state immediately for responsive UI
    setChatLogs(prev =>
      prev.map(chat =>
        chat.id === chatId ? { ...chat, title: newTitle } : chat
      )
    )

    // Update backend
    try {
      const success = await updateChatTitleInBackend(chatId, newTitle)
      if (!success) {
        // Rollback on failure
        setChatLogs(prev =>
          prev.map(chat =>
            chat.id === chatId ? { ...chat, title: originalTitle } : chat
          )
        )
        console.error('Failed to update chat title, rolling back')
      }
    } catch (error) {
      // Rollback on error
      setChatLogs(prev =>
        prev.map(chat =>
          chat.id === chatId ? { ...chat, title: originalTitle } : chat
        )
      )
      console.error('Error updating chat title, rolling back:', error)
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
        const response = await fetch(`http://localhost:8080/api/chats/${chatId}?user_email=${encodeURIComponent(user.email)}`, {
          method: 'DELETE',
          credentials: 'include'
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
                  <div className={`chat-message ${msg.role}`}>
                    {msg.role === 'bot' && index === messages.length - 1 && !loading ?
                      <>
                        {displayedText}
                        <span className="blinking-cursor">|</span>
                      </>
                    : msg.content}
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
            />
          </div>
        )}
      </div>
    </div>
  )
}

export default HomePage