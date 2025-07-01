"use client"
import { useState } from 'react'
import SearchBox from '@/components/search-box/search-box.component'

const HomePage = () => {
  const [query, setQuery] = useState('')
  const [response, setResponse] = useState('')
  const [loading, setLoading] = useState(false)
  const [hasAsked, setHasAsked] = useState(false)

  const handleInputChange = (event) => {
    setQuery(event.target.value)
  }
  
  const handleFormSubmit = async (event) => {
    event.preventDefault()
    if (query.trim() === '') return

    setLoading(true)
    setResponse('')
    setHasAsked(true)

    try {
      const res = await fetch('http://localhost:5000/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: query }),
      })

      const data = await res.json()
      setResponse(data.response)
    } catch (error) {
      console.error('Error:', error)
      setResponse('Something went wrong.')
    } finally {
      setLoading(false)
      setQuery('')
    }
  }

  return (
    <div className={`HomePage ${hasAsked ? 'has-asked': 'initial'}`}>
      {!hasAsked && (
        <>
          <h1 className='home-title'>Welcome to Tutor Chatbot</h1>
          <p className='home-description'>Ask a psychology question to get started.</p>
        </>
      )}

      {response && (
        <div className='chat-response'>
          {loading ? 'Loading...' : response}
        </div>
      )}

      <div className={`chat-box-wrapper ${hasAsked ? 'fixed-bottom': ''}`}>
        <SearchBox
          value={query}
          onChange={handleInputChange}
          onSubmit={handleFormSubmit}
          className='chat-box'
        />
      </div>
    </div>
      
  )
}

export default HomePage
