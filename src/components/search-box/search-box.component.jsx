import { useRef, useEffect } from 'react'
import { FiSend } from 'react-icons/fi'
import './search-box.styles.css'

const SearchBox = ({ value, onChange, onSubmit, className, placeholder = 'Enter a psychology question' }) => {
  const textareaRef = useRef(null)

  useEffect(() => {
    const el = textareaRef.current
    if (!el) return

    // Reset so scrollHeight is accurate
    el.style.height = 'auto'

    const styles = window.getComputedStyle(el)
    const lineHeight = parseFloat(styles.lineHeight) || 24

    // Height cap: 4 lines
    const maxHeight = Math.round(lineHeight * 6)

    const nextHeight = Math.min(el.scrollHeight, maxHeight)
    el.style.height = `${nextHeight}px`

    // Scroll only after hitting the cap
    el.style.overflowY = el.scrollHeight > maxHeight ? 'auto' : 'hidden'
  }, [value])

  const handleKeyDown = (event) => {
    // Enter sends, Shift+Enter makes a newline (like ChatGPT)
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      onSubmit(event)
    }
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    if (value.trim()) onSubmit(event)
  }

  return (
    <div className={`search-box-container ${className || ''}`}>
      <form onSubmit={handleSubmit} className='search-box-form'>
        <div className='search-input-wrapper'>
          <textarea
            ref={textareaRef}
            value={value}
            onChange={onChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className='search-textarea'
            rows={1}
          />

          <div className='search-button-wrapper'>
            <button
              type='submit'
              className={`search-send-button ${!value.trim() ? 'disabled' : ''}`}
              disabled={!value.trim()}
              aria-label='Send message'
            >
              <FiSend size={18} />
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}

export default SearchBox
