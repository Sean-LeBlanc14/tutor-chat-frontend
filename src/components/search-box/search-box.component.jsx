import { useRef, useEffect } from 'react'
import { FiSend } from 'react-icons/fi'
import './search-box.styles.css'

const SearchBox = ({ value, onChange, onSubmit, className }) => {
    const textareaRef = useRef(null)

    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto'
            textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
        }
    }, [value])

    return (
        <form onSubmit={onSubmit} className={className}>
            <div className='input-wrapper'>
                <textarea
                    ref={textareaRef}
                    value={value}
                    onChange={onChange}
                    onKeyDown={(event) => {
                        if (event.key === 'Enter' && !event.shiftKey) {
                            event.preventDefault()
                            onSubmit(event)
                        }
                    }}
                    placeholder='Enter a psychology question' 
                    rows={1}
                />
                <div className='button-wrapper'>
                    <button type='submit' className='send-button' aria-label='Send'>
                        <FiSend size={20} />
                    </button>
                </div>   
            </div>
        </form>
    )
}

export default SearchBox