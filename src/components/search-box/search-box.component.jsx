import { useRef, useEffect } from 'react'
import { FiSend } from 'react-icons/fi'
import './search-box.styles.css'

const SearchBox = ({ value, onChange, onSubmit, className, placeholder = 'Enter a psychology question' }) => {
    const textareaRef = useRef(null)

    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto'
            const scrollHeight = textareaRef.current.scrollHeight
            textareaRef.current.style.height = `${Math.min(scrollHeight, 120)}px`
        }
    }, [value])

    const handleKeyDown = (event) => {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault()
            onSubmit(event)
        }
    }

    const handleSubmit = (event) => {
        event.preventDefault()
        if (value.trim()) {
            onSubmit(event)
        }
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
                        disabled={false}
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