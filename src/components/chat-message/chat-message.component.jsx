// components/ChatMessage.jsx
import React, { useState, useEffect } from 'react';
import { SimpleFormatter } from '@/app/utils/simpleFormatter';
import './ChatMessage.css';

const ChatMessage = ({ message, originalQuestion = '', isStreaming = false }) => {
const [showFormatted, setShowFormatted] = useState(false);
const [formattedContent, setFormattedContent] = useState('');
const [canFormat, setCanFormat] = useState(false);

// Check if formatting would help this message
useEffect(() => {
    if (message.role === 'assistant' && message.content && message.content.length > 100 && !isStreaming) {
    const formatted = SimpleFormatter.formatResponse(message.content, originalQuestion);
    const hasImprovement = formatted !== message.content && formatted.includes('##');
    
    if (hasImprovement) {
        setFormattedContent(formatted);
        setCanFormat(true);
        
        // Auto-format for list questions
        if (/(?:effects?|types?|benefits?|examples?) of/i.test(originalQuestion)) {
        setShowFormatted(true);
        }
    }
    }
}, [message.content, originalQuestion, isStreaming]);

const displayContent = showFormatted && formattedContent 
    ? SimpleFormatter.toHtml(formattedContent)
    : message.content;

const isHtmlContent = showFormatted && formattedContent;

return (
    <div className={`chat-message-container ${message.role}`}>
    <div className={`chat-message ${message.role}`}>
        <div className={`message-bubble ${message.role}`}>
        {/* Format toggle button */}
        {canFormat && !isStreaming && message.role === 'assistant' && (
            <button 
            className={`format-btn ${showFormatted ? 'active' : ''}`}
            onClick={() => setShowFormatted(!showFormatted)}
            title={showFormatted ? 'Show original response' : 'Show formatted response'}
            >
            {showFormatted ? '📄' : '✨'}
            </button>
        )}

        {/* Message content */}
        <div className="message-text">
            {isHtmlContent ? (
            <div dangerouslySetInnerHTML={{ __html: displayContent }} />
            ) : (
            <div className="raw-content">
                {displayContent}
            </div>
            )}
        </div>

        {/* Streaming indicator */}
        {isStreaming && (
            <div className="streaming-indicator">
            <span className="cursor">|</span>
            </div>
        )}
        </div>
    </div>
    </div>
);
};

export default ChatMessage;