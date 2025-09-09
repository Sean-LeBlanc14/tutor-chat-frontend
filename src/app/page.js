// Fixed page.js with newline debugging
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
import ChatMessage from '@/components/chat-message/chat-message.component'

const HomePage = () => {
  const { user } = useAuth()
  const { isAdmin } = useRole()
  const router = useRouter()

  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [hasAsked, setHasAsked] = useState(false)
  const [chatLogs, setChatLogs] = useState([])
  const [activeChatId, setActiveChatId] = useState(null)
  const [chatsLoaded, setChatsLoaded] = useState(false)
  const [streamingMessageId, setStreamingMessageId] = useState(null)

  const chatHistoryRef = useRef(null)
  const streamingContentRef = useRef('')

  const activeChat = useMemo(
    () => chatLogs.find(chat => chat.id === activeChatId),
    [chatLogs, activeChatId]
  )

  const messages = useMemo(
    () => activeChat?.messages || [],
    [activeChat?.messages]
  )

  const handleInputChange = (event) => {
    setQuery(event.target.value)
  }

  const generateChatTitle = (message) => {
    let title = message.trim()
    title = title.replace(/^(what|how|why|when|where|who|can|could|would|should|is|are|do|does|did|tell me about|explain)\s+/i, '')
    if (title.length > 30) {
      const truncated = title.substring(0, 30)
      const lastSpace = truncated.lastIndexOf(' ')
      title = lastSpace > 15 ? truncated.substring(0, lastSpace) : truncated
    }
    title = title.replace(/[.!?]*$/, '')
    title = title.charAt(0).toUpperCase() + title.slice(1)
    if (title.length < 3) title = 'New Chat'
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
      if (!response.ok) throw new Error('Failed to get response')

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

      let buffer = ''
      let doneStreaming = false
      let debugCounter = 0 // Add counter for debugging

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
              // Extract everything after "data: " INCLUDING newlines and spaces
              const contentLine = line.substring(6)
              
              // Check for sentinel
              if (contentLine === '[DONE]') {
                doneStreaming = true
                continue
              }

              // Debug logging to see what we're getting
              debugCounter++
              if (debugCounter <= 20 || contentLine === '') { // Log first 20 and all empty lines
                console.log(`Line ${debugCounter}: data content = "${contentLine}" (empty: ${contentLine === ''})`)
              }

              // Add space if needed between tokens
              if (contentLine === '') {
                streamingContentRef.current += '\n'
              } else {
                // Check if we need to add a space before this content
                const currentContent = streamingContentRef.current
                const needsSpace = currentContent.length > 0 && 
                                   !currentContent.endsWith(' ') && 
                                   !currentContent.endsWith('\n') &&
                                   !contentLine.startsWith(' ') &&
                                   !contentLine.match(/^[.,:;!?]/)
                
                if (needsSpace) {
                  streamingContentRef.current += ' '
                }
                streamingContentRef.current += contentLine
              }
            }
            // If line doesn't start with "data:", it might be a continuation
            else if (line.trim() && !line.startsWith(':')) {
              console.log(`Non-data line found: "${line}"`)
              streamingContentRef.current += '\n' + line
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

      // Log final content structure
      console.log('Final content newline count:', (streamingContentRef.current.match(/\n/g) || []).length)
      console.log('Content has double newlines:', streamingContentRef.current.includes('\n\n'))

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

      // Save assistant message
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

  const startNewChat = useCallback(() => {
    if (!user?.email) return
    const newChatId = crypto.randomUUID()
    const newChat = { id: newChatId, title: '', messages: [], created_at: new Date().toISOString() }
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
    const newMessage = {
      id: crypto.randomUUID(),
      role,
      content: sanitizeInput(content),
      created_at: new Date().toISOString()
    }
    const currentChat = chatLogs.find(chat => chat.id === activeChatId)
    const isFirstUserMessage = currentChat && role === 'user' && currentChat.messages.length === 0
    let newTitle = currentChat?.title || ''
    if (isFirstUserMessage) newTitle = generateChatTitle(content)

    setChatLogs(prev =>
      prev.map(chat => chat.id === activeChatId
        ? { ...chat, title: isFirstUserMessage ? newTitle : chat.title, messages: [...chat.messages, newMessage] }
        : chat
      )
    )

    if (user?.email && activeChatId) {
      try {
        const response = await apiRequest(API_ENDPOINTS.chat.messages(activeChatId), {
          method: 'POST',
          body: JSON.stringify({ user_email: user.email, role, content: newMessage.content })
        })
        if (!response.ok) {
          const errorText = await response.text()
          console.error('Failed to save message:', errorText)
        } else if (isFirstUserMessage && newTitle) {
          await updateChatTitleInBackend(activeChatId, newTitle)
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
        body: JSON.stringify({ title: sanitizeInput(title) })
      })
      return response.ok
    } catch (error) {
      console.error('Error updating chat title:', error)
      return false
    }
  }

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
        const processedChats = chats.map(chat => ({
          ...chat,
          title: chat.title || 'New Chat',
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

  useEffect(() => {
    if (chatsLoaded && user?.email && chatLogs.length === 0) startNewChat()
  }, [chatsLoaded, user?.email, chatLogs.length, startNewChat])

  const handleRenameChat = async (chatId, newTitle) => {
    const sanitizedTitle = sanitizeInput(newTitle)
    if (!validateInput(sanitizedTitle, 100)) {
      alert('Title is invalid or too long')
      return
    }
    const originalTitle = chatLogs.find(chat => chat.id === chatId)?.title
    setChatLogs(prev =>
      prev.map(chat => chat.id === chatId ? { ...chat, title: sanitizedTitle } : chat)
    )
    try {
      const success = await updateChatTitleInBackend(chatId, sanitizedTitle)
      if (!success) {
        setChatLogs(prev =>
          prev.map(chat => chat.id === chatId ? { ...chat, title: originalTitle } : chat)
        )
      }
    } catch (error) {
      setChatLogs(prev =>
        prev.map(chat => chat.id === chatId ? { ...chat, title: originalTitle } : chat)
      )
      console.error('Error updating chat title:', error)
    }
  }

  const handleDeleteChat = async (chatId) => {
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
    if (user?.email) {
      try {
        const response = await apiRequest(API_ENDPOINTS.chat.deleteChat(chatId, user.email), {
          method: 'DELETE'
        })
        if (!response.ok) console.error('Failed to delete chat from backend')
      } catch (error) {
        console.error('Error deleting chat:', error)
      }
    }
  }

  useEffect(() => {
    if (user === null) router.push('/login')
  }, [user, router])

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