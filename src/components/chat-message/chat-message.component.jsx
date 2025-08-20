// components/ChatMessage.jsx
import React from 'react';
import '@/components/chat-message/chat-message.styles.css';

const ChatMessage = ({ message, isStreaming = false }) => {
  // Render assistant/user content exactly as received (no formatting, no transforms)
    return (
        <div className={`chat-message ${message.role}`} style={{ position: 'relative' }}>
        <div className="chat-output" style={{ whiteSpace: 'pre-wrap' }}>
            {message?.content ?? ''}
        </div>

        {isStreaming && (
            <div className="streaming-indicator">
            <span className="streaming-cursor">|</span>
            </div>
        )}
        </div>
    );
};

export default ChatMessage;
