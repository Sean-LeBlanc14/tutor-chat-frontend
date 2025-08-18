import React, { useState, useEffect } from 'react';
import { responseFormatter } from '@/app/utils/responseFormatter';
import '@/components/chat-message/chat-message.styles.css';

const ChatMessage = ({ message, originalQuestion = '', isStreaming = false }) => {
    const [showFormatted, setShowFormatted] = useState(false);
    const [formattedContent, setFormattedContent] = useState('');
    const [canFormat, setCanFormat] = useState(false);

    // Check if formatting would help this message
    useEffect(() => {
        if (message.role === 'assistant' && message.content && message.content.length > 100 && !isStreaming) {
        const formatted = responseFormatter.formatResponse(message.content, originalQuestion);
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

    // Plain-text rendering only (no HTML injection). Preserve line breaks.
    const displayContent = showFormatted && formattedContent
        ? formattedContent
        : message.content;

    return (
        <div className={`chat-message ${message.role}`} style={{ position: 'relative' }}>
        {/* Format toggle button - only for assistant messages that can be formatted */}
        {canFormat && !isStreaming && message.role === 'assistant' && (
            <button
            className={`format-toggle-btn ${showFormatted ? 'active' : ''}`}
            onClick={() => setShowFormatted(!showFormatted)}
            title={showFormatted ? 'Show original response' : 'Show formatted response'}
            >
            {showFormatted ? '📄' : '✨'}
            </button>
        )}

        {/* Message content (plain text) */}
        <div className="chat-output" style={{ whiteSpace: 'pre-wrap' }}>
            {displayContent}
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
