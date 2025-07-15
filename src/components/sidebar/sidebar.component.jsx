'use client'

import React, { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { supabase } from '@/app/lib/supabaseClient'
import './sidebar.styles.css'

const Sidebar = ({ 
    chatLogs, 
    activeChatId, 
    onNewChat, 
    onSelectChat, 
    onRenameChat, 
    onDeleteChat,
    sandboxEnvironments = [],
    onSelectEnvironment,
    isAdmin
}) => {

    const [editingChatId, setEditingChatId] = useState(null)
    const [editTitle, setEditTitle] = useState('')
    const [sidebarOpen, setSidebarOpen] = useState(true)
    const [userToggled, setUserToggled] = useState(false)
    const [isMobile, setIsMobile] = useState(false)
    const [mode, setMode] = useState('chat')

    const router = useRouter()
    const pathname = usePathname()

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

    useEffect(() => {
        if (pathname.startsWith('/sandbox')) {
            setMode('sandbox')
        } else {
            setMode('chat')
        }
    }, [pathname])

    const handleLogout = async () => {
        localStorage.clear()
        
        await supabase.auth.signOut()

        window.location.href = '/login'
    }

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

    const handleModeSwitch = (newMode) => {
        setMode(newMode)
        router.push(newMode === 'sandbox' ? '/sandbox' : '/')
    }

    return (
        <div className={`menu-wrapper ${sidebarOpen ? 'sidebar-open': 'sidebar-closed'}`}>
            <button className='menu-toggle' onClick={toggleSidebar}>
                ☰
            </button>
            <button className='logout-button' onClick={handleLogout}>
                Log Out
            </button>

            {sidebarOpen && isMobile && (
                <div className="overlay" onClick={toggleSidebar}></div>
            )}

            <aside className={`sidebar ${sidebarOpen ? 'open': 'closed'}`}>
                <div className='sidebar-header'>
                    <button className='new-chat-button' onClick={onNewChat}>
                        + {mode === 'chat' ? 'New Chat': 'New Test'}
                    </button>

                    {isAdmin && (
                        <div className='mode-toggle'>
                            <button
                                className={`mode-button ${mode === 'chat' ? 'active' : ''}`}
                                onClick={() => handleModeSwitch('chat')}
                            >
                                Chat
                            </button>
                            <button
                                className={`mode-button ${mode === 'sandbox' ? 'active' : ''}`}
                                onClick={() => handleModeSwitch('sandbox')}
                            >
                                Sandbox
                            </button>
                        </div>
                    )}
                </div>

                <div className='chat-list'>
                    {mode === 'chat' && chatLogs.map(chat => (
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

                    {mode === 'sandbox' && sandboxEnvironments.map(env => (
                        <div
                            key={env.id}
                            className='chat-item'
                            onClick={() => onSelectEnvironment(env)}
                        >
                            <div className='chat-title-row'>
                                <span className='chat-title-text'>{env.name || 'Untitled Env'}</span>
                                <span className='chat-title-sub'>Prompt: {env.system_prompt?.slice(0, 30) || '...'}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </aside>
        </div>
    )
}

export default Sidebar