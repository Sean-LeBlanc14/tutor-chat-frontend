import React from 'react';
import '@/components/chat-message/chat-message.styles.css';

const ChatMessage = ({ message, isStreaming = false }) => {
    return (
        <div className={`chat-message ${message.role}`} style={{ position: 'relative' }}>
        {/* Message content (plain text only) */}
        <div className="chat-output" style={{ whiteSpace: 'pre-wrap' }}>
            {message.content}
        </div>

        {/* Streaming indicator */}
        {isStreaming && (
            <div className="streaming-indicator">
            <span className="streaming-cursor">|</span>
            </div>
        )}
        </div>
    );
};

export default ChatMessage;
