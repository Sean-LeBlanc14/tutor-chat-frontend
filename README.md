# Psychology Tutor Chatbot — Frontend

A React/Next.js frontend for an AI-powered psychology tutoring platform built for Dr. Maruti Mishra's Sensation and Perception lab course at California State University, Bakersfield. Presented as a research poster at AIxHEArt 2025 (25% acceptance rate).

**Backend Repository:** [tutor-chat-backend](https://github.com/Sean-LeBlanc14/tutor-chat-backend)

---

## Overview

A responsive chat interface that connects students with an AI tutor trained on course-specific materials. The frontend handles real-time SSE token streaming, persistent chat history, JWT-based authentication via httpOnly cookies, and role-based UI for student and admin users.

---

## Technical Stack

| Category | Technologies |
|---|---|
| Framework | Next.js 14 (App Router), React 18 |
| Language | JavaScript |
| Styling | CSS Modules, CSS Variables |
| State Management | React Context, Hooks (useState, useEffect, useCallback, useMemo) |
| Authentication | JWT via httpOnly cookies, custom AuthContext |
| Deployment | Vercel |

---

## Key Engineering Details

### SSE Streaming

Model responses are streamed token-by-token from the backend via Server-Sent Events. The frontend reads the stream using the Fetch API's `ReadableStream`, parses SSE frames manually, and uses `ReactDOM.flushSync` to force synchronous React state updates on each token — ensuring the UI updates in real time without batching delays. Newline handling accounts for markdown formatting in streamed content.

### Authentication

JWT tokens are stored in httpOnly cookies set by the backend, meaning JavaScript never has direct access to the token. The `AuthContext` provider calls `/api/me` on page load to verify the session and hydrate user state. All API requests use `credentials: 'include'` so cookies are automatically attached. Input sanitization and validation run on all auth fields before submission.

### Role-Based UI

A `useRole` hook reads the authenticated user's role and conditionally renders admin-only features — primarily the sandbox mode, which allows admin users to create custom AI configurations and test different system prompts against the live model.

### Chat State Management

Chat history is managed in React state as an array of chat objects, each containing a message array. The active chat is tracked by ID, with messages appended optimistically on send and persisted to the backend asynchronously. Chat titles are auto-generated from the first user message using a cleaning function that strips common question prefixes and truncates to 30 characters.

---

## Features

- Real-time token streaming via SSE with `ReactDOM.flushSync`
- Persistent chat history loaded from PostgreSQL on login
- Sidebar with chat list, rename, and delete functionality
- Role-based access control (student vs. admin)
- Admin sandbox mode for custom AI environment testing
- JWT authentication with httpOnly cookies and session persistence
- Input sanitization and length validation on all user input
- Responsive layout optimized for desktop and mobile

---

## Project Structure

```
/app
  /lib          — AuthContext, session management
  /utils        — API endpoints, request wrapper, security helpers
/components
  /chat-message     — Message rendering with markdown support
  /search-box       — Input component
  /sidebar          — Chat history navigation
  /spinner          — Loading state
/hooks
  useRole.js        — Role-based access control
```

---

## API Integration

All requests go through a centralized `apiRequest` wrapper that sets `credentials: 'include'` and `Content-Type: application/json` on every call. Streaming requests return the raw Response object for the caller to consume via `ReadableStream`. Endpoints are defined in a single `API_ENDPOINTS` config object keyed by feature area (auth, chat, sandbox).

---

## Contact

**Sean LeBlanc-Grappendorf** — CS Student, Cal Poly San Luis Obispo

- Email: seanaugustlg2006@gmail.com
- LinkedIn: [linkedin.com/in/sean-leblanc-grappendorf-6045a8331](https://www.linkedin.com/in/sean-leblanc-grappendorf-6045a8331/)
- Portfolio: [seanlg.com](https://seanlg.com/)
- GitHub: [github.com/Sean-LeBlanc14](https://github.com/Sean-LeBlanc14)
