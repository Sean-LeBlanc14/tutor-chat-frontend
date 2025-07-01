"use client"
import { useState } from 'react'
import SearchBox from '@/components/search-box/search-box.component'

const HomePage = () => {
  const [query, setQuery] = useState('')

  const handleInputChange = (event) => {
    setQuery(event.target.value)
  }
  
  const handleFormSubmit = (event) => {
    event.preventDefault()
    console.log('Submit question:', query)
  }

  return (
    <div className='HomePage'>
      <h1 className='home-title'>Welcome to Tutor Chatbot</h1>
      <p className='home-description'>Ask a psychology question to get started.</p>
      <SearchBox
        value={query}
        onChange={handleInputChange}
        onSubmit={handleFormSubmit}
        className='chat-box'
      />
    </div>
  )
}

export default HomePage
