'use client'

import React, { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from '@/app/lib/authContext'
import { FiPlus, FiEdit2, FiTrash2, FiMessageSquare, FiSettings, FiLogOut, FiMenu, FiX } from 'react-icons/fi'
import './sidebar.styles.css'

const Sidebar = ({ 
    chatLogs, 
    activeChatId, 
    onNewChat, 
    onSelectChat, 
    onRenameChat, 
    onDeleteChat,
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
    const { logout } = useAuth()

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

    // Add/remove class to body for desktop sidebar state
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const body = document.body
            if (sidebarOpen && window.innerWidth >= 768) {
                body.classList.add('sidebar-open')
            } else {
                body.classList.remove('sidebar-open')
            }
        }
    }, [sidebarOpen])

    useEffect(() => {
        if (pathname.startsWith('/sandbox')) {
            setMode('sandbox')
        } else {
            setMode('chat')
        }
    }, [pathname])

    const handleLogout = async () => {
        try {
            await logout()
            localStorage.clear()
            router.push('/login')
        } catch (error) {
            console.error('Logout error:', error)
            localStorage.clear()
            router.push('/login')
        }
    }

    const handleRenameStart = (chat) => {
        setEditingChatId(chat.id)
        setEditTitle(chat.title || '')
    }

    const handleRenameSubmit = (chatId) => {
        const newTitle = editTitle.trim()
        if (newTitle) {
            onRenameChat(chatId, newTitle)
        }
        setEditingChatId(null)
        setEditTitle('')
    }

    const handleRenameCancel = () => {
        setEditingChatId(null)
        setEditTitle('')
    }

    const handleModeSwitch = (newMode) => {
        setMode(newMode)
        router.push(newMode === 'sandbox' ? '/sandbox' : '/')
    }

    return (
        <>
            {/* Mobile Toggle Button */}
            <button 
                className={`sidebar-toggle ${sidebarOpen ? 'open' : ''}`} 
                onClick={toggleSidebar}
                aria-label="Toggle sidebar"
            >
                {sidebarOpen ? <FiX size={20} /> : <FiMenu size={20} />}
            </button>

            {/* Mobile Overlay */}
            {sidebarOpen && isMobile && (
                <div className="sidebar-overlay" onClick={toggleSidebar}></div>
            )}

            {/* Sidebar */}
            <aside className={`sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
                {/* Header Section */}
                <div className='sidebar-header'>
                    <button className='new-chat-btn' onClick={onNewChat}>
                        <FiPlus size={18} />
                        {mode === 'chat' ? 'New Chat' : 'New Test'}
                    </button>

                    {isAdmin && (
                        <div className='mode-switcher'>
                            <button
                                className={`mode-btn ${mode === 'chat' ? 'active' : ''}`}
                                onClick={() => handleModeSwitch('chat')}
                            >
                                <FiMessageSquare size={16} />
                                Chat
                            </button>
                            <button
                                className={`mode-btn ${mode === 'sandbox' ? 'active' : ''}`}
                                onClick={() => handleModeSwitch('sandbox')}
                            >
                                <FiSettings size={16} />
                                Sandbox
                            </button>
                        </div>
                    )}
                </div>

                {/* Chat/Session List */}
                <div className='chat-list'>
                    {chatLogs.length === 0 ? (
                        <div className='empty-chat-list'>
                            <p>No {mode === 'chat' ? 'chats' : 'sessions'} yet</p>
                        </div>
                    ) : (
                        chatLogs.map(chat => (
                            <div
                                key={chat.id}
                                className={`chat-item ${chat.id === activeChatId ? 'active' : ''}`}
                                onClick={() => onSelectChat(chat.id)}
                            >
                                {editingChatId === chat.id ? (
                                    <div className='chat-rename'>
                                        <input
                                            className='rename-input'
                                            value={editTitle}
                                            onChange={(e) => setEditTitle(e.target.value)}
                                            onBlur={() => handleRenameSubmit(chat.id)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') handleRenameSubmit(chat.id)
                                                if (e.key === 'Escape') handleRenameCancel()
                                            }}
                                            autoFocus
                                            maxLength={50}
                                        />
                                    </div>
                                ) : (
                                    <div className='chat-content'>
                                        <div className='chat-title'>
                                            {chat.title || `New ${mode === 'chat' ? 'Chat' : 'Session'}`}
                                        </div>
                                        <div className='chat-actions'>
                                            <button 
                                                className='action-btn edit-btn'
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    handleRenameStart(chat)
                                                }}
                                                aria-label="Rename"
                                            >
                                                <FiEdit2 size={14} />
                                            </button>
                                            <button 
                                                className='action-btn delete-btn'
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    if (confirm(`Delete this ${mode}?`)) {
                                                        onDeleteChat(chat.id)
                                                    }
                                                }}
                                                aria-label="Delete"
                                            >
                                                <FiTrash2 size={14} />
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>

                {/* Footer Section */}
                <div className='sidebar-footer'>
                    <button className='logout-btn' onClick={handleLogout}>
                        <FiLogOut size={18} />
                        Sign Out
                    </button>
                </div>
            </aside>
        </>
    )
}

export default Sidebar