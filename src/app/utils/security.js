// utils/security.js - Create this new file
export const sanitizeInput = (input) => {
    if (!input || typeof input !== 'string') return ''
    
    // Only remove dangerous script-related content, preserve normal text and spaces
    return input
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
        .replace(/javascript:/gi, '')
        .replace(/on\w+\s*=/gi, '')
        // Don't trim here - preserve leading/trailing spaces in input
    }

    export const validateInput = (input, maxLength = 5000) => {
    if (!input || typeof input !== 'string') return false
    if (input.length > maxLength) return false
    if (input.trim().length === 0) return false
    return true
}