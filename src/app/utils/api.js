// utils/api.js - Updated with proper backend URLs and missing endpoints
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

export const API_ENDPOINTS = {
    auth: {
        login: `${API_BASE_URL}/api/login`,
        signup: `${API_BASE_URL}/api/signup`,
        logout: `${API_BASE_URL}/api/logout`,
        me: `${API_BASE_URL}/api/me`
    },
    chat: {
        base: `${API_BASE_URL}/api/chat`,
        stream: `${API_BASE_URL}/api/chat/stream`,
        chats: (userEmail) => `${API_BASE_URL}/api/chats/${userEmail}`,
        messages: (chatId) => `${API_BASE_URL}/api/chats/${chatId}/messages`,
        updateChat: (chatId) => `${API_BASE_URL}/api/chats/${chatId}`,
        deleteChat: (chatId, userEmail) => `${API_BASE_URL}/api/chats/${chatId}?user_email=${userEmail}`
    },
    sandbox: {
        environments: `${API_BASE_URL}/api/sandbox/environments`,
        createEnvironment: `${API_BASE_URL}/api/sandbox/environments`,
        sessions: (envId) => `${API_BASE_URL}/api/sandbox/sessions/${envId}`,
        createSession: `${API_BASE_URL}/api/sandbox/sessions`,
        sessionMessages: (sessionId) => `${API_BASE_URL}/api/sandbox/sessions/${sessionId}/messages` // Added missing endpoint
    }
    };

export const apiRequest = async (url, options = {}) => {
    const config = {
        headers: {
        'Content-Type': 'application/json',
        ...options.headers,
        },
        credentials: 'include', // Important for cookies
        ...options,
    };

    try {
        const response = await fetch(url, config);
        
        // If this is a streaming request, return the response directly
        // so the caller can handle the stream
        if (options.stream) {
            return response;
        }
        
        return response;
    } catch (error) {
        console.error('API Request failed:', error);
        throw error;
    }
};