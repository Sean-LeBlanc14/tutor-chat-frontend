import React, { useState, useEffect } from 'react'
import './sidebar.styles.css'

const Sidebar = ({ chatLogs, activeChatId, onNewChat, onSelectChat, onRenameChat, onDeleteChat }) => {

    const [editingChatId, setEditingChatId] = useState(null)
    const [editTitle, setEditTitle] = useState('')
    const [sidebarOpen, setSidebarOpen] = useState(true)
    const [userToggled, setUserToggled] = useState(false)
    const [isMobile, setIsMobile] = useState(false)

    const toggleSidebar = () => {
        setSidebarOpen(prev => !prev)
        setUserToggled(true)
    }
    
    useEffect(() => {
        const handleResize = () => {
            const width = window.innerWidth
            setIsMobile(width < 768)

            if (width < 768) {
                setSidebarOpen(false)
            } else {
                if (!userToggled) {
                    setSidebarOpen(true)
                }
            }
        }

        handleResize()

        window.addEventListener('resize', handleResize)

        return () => window.removeEventListener('resize', handleResize)
    }, [userToggled])

    const handleRenameStart = (chat) => {
        setEditingChatId(chat.id)
        setEditTitle(chat.title)
    }

    const handleRenameSubmit = (chatId) => {
        const newTitle = editTitle.trim()
        if (newTitle) {
            onRenameChat(chatId, newTitle)
        }

        setEditingChatId(null)
        setEditTitle('')
    }

    return (
        <div className={`menu-wrapper ${sidebarOpen ? 'sidebar-open': 'sidebar-closed'}`}>
            <button className='menu-toggle' onClick={toggleSidebar}>
                ☰
            </button>

            {sidebarOpen && isMobile && (
                <div className="overlay" onClick={toggleSidebar}></div>
            )}

            <aside className={`sidebar ${sidebarOpen ? 'open': 'closed'}`}>
                <div className='sidebar-header'>
                    <button className='new-chat-button' onClick={onNewChat}>
                        + New Chat
                    </button>
                </div>
                <div className='chat-list'>
                    {chatLogs.map(chat => (
                        <div
                            key={chat.id}
                            className={`chat-item ${chat.id === activeChatId ? 'active' : ''}`}
                            onClick={() => onSelectChat(chat.id)}
                        >
                            {editingChatId === chat.id ? (
                                <input
                                    className='rename-input'
                                    value={editTitle}
                                    onChange={(event) => setEditTitle(event.target.value)}
                                    onBlur={() => handleRenameSubmit(chat.id)}
                                    onKeyDown={(event) => event.key === 'Enter' && handleRenameSubmit(chat.id)}
                                    autoFocus
                                />
                            ) : (
                                <div className='chat-title-row' onClick={() => onSelectChat(chat.id)}>
                                    <span className='chat-title-text'>
                                        {chat.title || 'New Chat'}
                                    </span>
                                    <button className='icon-btn' onClick={(event) => {event.stopPropagation(); handleRenameStart(chat) }}>✏️</button>
                                    <button className='icon-btn' onClick={(event) => {event.stopPropagation(); onDeleteChat(chat.id) }}>🗑️</button>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </aside>
        </div>
    )
}

export default Sidebar