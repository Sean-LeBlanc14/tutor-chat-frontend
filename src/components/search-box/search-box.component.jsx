import { useRef, useEffect } from 'react'
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
            <textarea
                ref={textareaRef}
                value={value}
                onChange={onChange}
                placeholder='Enter a psychology question' 
                rows={1}
            />
            <button type='submit'>Ask</button>
        </form>
    )
}

export default SearchBox