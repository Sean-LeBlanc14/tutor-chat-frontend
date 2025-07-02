"use client"
import { useEffect, useState, useRef } from 'react'
import SearchBox from '@/components/search-box/search-box.component'
import Spinner from '@/components/spinner/spinner.component'

const HomePage = () => {
  const [query, setQuery] = useState('')
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(false)
  const [hasAsked, setHasAsked] = useState(false)
  const [displayedText, setDisplayedText] = useState('')

  const chatHistoryRef = useRef(null)

  const handleInputChange = (event) => {
    setQuery(event.target.value)
  }
  
  const handleFormSubmit = async (event) => {
    event.preventDefault()
    if (query.trim() === '') return

    setMessages(prev => [...prev, { role: 'user', content: query }])
    setLoading(true)
    setDisplayedText('')
    setHasAsked(true)
    setQuery('')

    try {
      const res = await fetch('http://localhost:5000/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: query }),
      })

      const data = await res.json()
      setMessages(prev => [...prev, 
        { role: 'bot', content: data.response }
      ])
    } catch (error) {
      console.error('Error:', error)
      setMessages(prev => [...prev, { role: 'bot', content: 'Something went wrong.' }])
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

  return (
    <div className={`HomePage ${hasAsked ? 'has-asked' : 'initial'}`}>
      {!hasAsked && (
        <>
          <h1 className="home-title">Welcome to Tutor Chatbot</h1>
          <p className="home-description">Ask a psychology question to get started.</p>
        </>
      )}

      {hasAsked && (
        <div className="chat-history" ref={chatHistoryRef}>
          {messages.map((msg, index) => (
            <div key={index} className={`chat-message ${msg.role}`}>
              {msg.role === 'bot' && index === messages.length - 1 && !loading ?
                <>
                  {displayedText}
                  <span className="blinking-cursor">|</span>
                </>
              : msg.content}
            </div>
          ))}
          {loading && (
            <div className="spinner-container">
              <Spinner />
            </div>
          )}
        </div>
      )}

      <div className={`chat-box-wrapper ${hasAsked ? 'fixed-bottom' : ''}`}>
        <SearchBox
          value={query}
          onChange={handleInputChange}
          onSubmit={handleFormSubmit}
          className="chat-box"
        />
      </div>
    </div>

  )
}

export default HomePage
