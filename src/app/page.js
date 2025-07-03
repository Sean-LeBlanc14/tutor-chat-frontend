"use client"
import { useEffect, useState, useRef } from 'react'
import SearchBox from '@/components/search-box/search-box.component'
import Spinner from '@/components/spinner/spinner.component'
import Sidebar from '@/components/sidebar/sidebar.component'

const HomePage = () => {
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [hasAsked, setHasAsked] = useState(false)
  const [displayedText, setDisplayedText] = useState('')
  const [chatLogs, setChatLogs] = useState([])
  const [activeChatId, setActiveChatId] = useState(null)

  const chatHistoryRef = useRef(null)

  const activeChat = chatLogs.find(chat => chat.id === activeChatId)
  const messages = activeChat?.messages || []

  const handleInputChange = (event) => {
    setQuery(event.target.value)
  }
  
  const handleFormSubmit = async (event) => {
    event.preventDefault()
    if (query.trim() === '') return

    addMessageToActive('user', query)
    setLoading(true)
    setDisplayedText('')
    setHasAsked(true)
    setQuery('')

    try {
      const res = await fetch('http://127.0.0.1:8000/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: query }),
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

  const startNewChat = () => {
    const newChat = {
      id: crypto.randomUUID(),
      title: '',
      messages: [],
      createdAt: Date.now()
    }

    setChatLogs(prev => [newChat, ...prev])
    setActiveChatId(newChat.id)
    setHasAsked(false)
  }

  const handleSelectChat = (chatId) => {
    setActiveChatId(chatId)
    setHasAsked(true)
  }

  const addMessageToActive = (role, content) => {
    setChatLogs(prev =>
      prev.map(chat => {
        if (chat.id !== activeChatId) return chat

        const newMessages = [...chat.messages, { id: crypto.randomUUID(), role, content }]
        let title = chat.title
        
        if (!title && role === 'user') {
          const trimmed = content.trim()
          title = trimmed.slice(0, 30).replace(/[.!?]*$/, '')
          title = title.charAt(0).toUpperCase() + title.slice(1)
        }

        return { ...chat, title, messages: newMessages }
      })
    )
  }

  useEffect(() => {
    if (chatLogs.length === 0) return

    localStorage.setItem('chatLogs', JSON.stringify(chatLogs))
    localStorage.setItem('activeChatId', activeChatId)
  }, [chatLogs, activeChatId])

  useEffect(() => {
    const storedLogs = localStorage.getItem('chatLogs')
    const storedActiveId = localStorage.getItem('activeChatId')

    if (storedLogs) {
      const parsedLogs = JSON.parse(storedLogs)
      setChatLogs(parsedLogs)
      if (storedActiveId) {
        setActiveChatId(storedActiveId)
        
        const activeChat = parsedLogs.find(chat => chat.id === storedActiveId)
        if (activeChat && activeChat.messages.length > 0) {
          setHasAsked(true)
        }
      }
    } else {
      startNewChat()
    }
  }, [])

  const handleRenameChat = (chatId, newTitle) => {
    setChatLogs(prev =>
      prev.map(chat =>
        chat.id === chatId ? { ...chat, title: newTitle } : chat
      )
    )
  }

  const handleDeleteChat = (chatId) => {
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
      />

      <div className={`HomePage ${hasAsked ? 'has-asked' : 'initial'}`}>
        {chatLogs.length === 0 ? (
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
