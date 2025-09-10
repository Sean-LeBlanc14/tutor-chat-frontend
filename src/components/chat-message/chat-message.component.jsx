// components/ChatMessage.jsx
import React from 'react';
import ReactMarkdown from 'react-markdown';
import '@/components/chat-message/chat-message.styles.css';

const ChatMessage = ({ message, isStreaming = false }) => {
    return (
        <div className={`chat-message ${message.role}`} style={{ position: 'relative' }}>
        <div className="chat-output">
            <ReactMarkdown
            components={{
                // Customize rendering to match your existing styles
                p: ({ children }) => <div className="markdown-paragraph">{children}</div>,
                strong: ({ children }) => <strong className="markdown-bold">{children}</strong>,
                em: ({ children }) => <em className="markdown-italic">{children}</em>,
                ul: ({ children }) => <ul className="markdown-list">{children}</ul>,
                ol: ({ children }) => <ol className="markdown-ordered-list">{children}</ol>,
                li: ({ children }) => <li className="markdown-list-item">{children}</li>,
                h1: ({ children }) => <h1 className="markdown-h1">{children}</h1>,
                h2: ({ children }) => <h2 className="markdown-h2">{children}</h2>,
                h3: ({ children }) => <h3 className="markdown-h3">{children}</h3>,
                h4: ({ children }) => <h4 className="markdown-h4">{children}</h4>,
                h5: ({ children }) => <h5 className="markdown-h5">{children}</h5>,
                h6: ({ children }) => <h6 className="markdown-h6">{children}</h6>,
                code: ({ children }) => <code className="markdown-code">{children}</code>,
                pre: ({ children }) => <pre className="markdown-pre">{children}</pre>,
                blockquote: ({ children }) => <blockquote className="markdown-blockquote">{children}</blockquote>,
            }}
            >
            {message?.content ?? ''}
            </ReactMarkdown>
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