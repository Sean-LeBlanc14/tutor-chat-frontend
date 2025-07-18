'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '../../app/lib/authContext'
import './sandbox-manager.styles.css'
import { useRouter } from 'next/navigation'

const SandboxManager = ({ onEnvironmentSelect, selectedEnvironment }) => {
    const router = useRouter()
    const { user } = useAuth()
    const [environments, setEnvironments] = useState([])
    const [loading, setLoading] = useState(true)
    const [showCreateForm, setShowCreateForm] = useState(false)
    const [newEnvironment, setNewEnvironment] = useState({
        name: '',
        description: '',
        system_prompt: '',
        model_config: { temperature: 0.7 }
    })

    useEffect(() => {
        fetchEnvironments()
    }, [])

    const fetchEnvironments = async () => {
        try {
            const response = await fetch('http://localhost:8080/api/sandbox/environments', {
                method: 'GET',
                credentials: 'include'
            })

            if (!response.ok) {
                throw new Error('Failed to fetch environments')
            }

            const data = await response.json()
            setEnvironments(data || [])
        } catch (error) {
            console.error('Error fetching environments:', error)
            setEnvironments([])
        } finally {
            setLoading(false)
        }
    }

    const createEnvironment = async (e) => {
        e.preventDefault()

        if (!newEnvironment.name.trim() || !newEnvironment.system_prompt.trim()) {
            alert('Please fill in name and system prompt')
            return
        }

        try {
            const response = await fetch('http://localhost:8080/api/sandbox/environments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(newEnvironment)
            })

            if (!response.ok) {
                throw new Error('Failed to create environment')
            }

            const data = await response.json()
            setEnvironments([data, ...environments])
            setNewEnvironment({
                name: '',
                description: '',
                system_prompt: '',
                model_config: { temperature: 0.7 }
            })
            setShowCreateForm(false)
        } catch (error) {
            console.error('Error creating environment:', error)
            alert('Error creating environment')
        }
    }

    const deleteEnvironment = async (id) => {
        if (!confirm('Are you sure you want to delete this environment?')) return

        try {
            console.log('Attempting to delete environment:', id)
            const response = await fetch(`http://localhost:8080/api/sandbox/environments/${id}`, {
                method: 'DELETE',
                credentials: 'include'
            })

            console.log('Delete response status:', response.status)
            
            if (!response.ok) {
                const errorData = await response.json()
                console.error('Delete failed with status:', response.status, 'Error:', errorData)
                alert(`Failed to delete environment: ${errorData.detail || 'Unknown error'}`)
                return
            }

            setEnvironments(environments.filter(env => env.id !== id))
            if (selectedEnvironment?.id === id) {
                onEnvironmentSelect(null)
            }
        } catch (error) {
            console.error('Error deleting environment:', error)
            alert('Error deleting environment: ' + error.message)
        }
    }

    const backToChats = () => {
        router.push('/')
    }

    // Example prompts for inspiration
    const examplePrompts = [
        {
            name: "Friendly Tutor",
            prompt: "You are a friendly and encouraging psychology tutor. Always explain concepts in simple terms and provide examples when possible. Be supportive and patient with students."
        },
        {
            name: "Strict Academic",
            prompt: "You are a strict psychology professor. Provide precise, academic responses. Always cite relevant theories and research. Do not provide answers that aren't well-supported by the literature."
        },
        {
            name: "Socratic Method",
            prompt: "You are a psychology tutor who uses the Socratic method. Instead of giving direct answers, ask probing questions to guide students to discover the answers themselves."
        }
    ]

    if (loading) return <div className="loading">Loading environments...</div>

    return (
        <div className='sandbox-manager'>
            <button onClick={backToChats} className="btn btn-back">
                ← Back to Chats
            </button>
            
            <div className='header'>
                <h3 className='title'>Sandbox Environments</h3>
                <button
                    onClick={() => setShowCreateForm(!showCreateForm)}
                    className='btn btn-primary'
                >
                    {showCreateForm ? 'Cancel': 'Create New'}
                </button>
            </div>

            {showCreateForm && (
                <div className='create-form'>
                    <form onSubmit={createEnvironment}>
                        <div className='form-grid'>
                            <div className='form-group'>
                                <label className='form-label'>Environment Name</label>
                                <input
                                    type='text'
                                    value={newEnvironment.name}
                                    onChange={(e) => setNewEnvironment({...newEnvironment, name: e.target.value})}
                                    className='form-input'
                                    placeholder='e.g., Friendly Tutor'
                                    required
                                />
                            </div>
                            
                            <div className='form-group'>
                                <label className='form-label'>Description (Optional)</label>
                                <input
                                    type='text'
                                    value={newEnvironment.description}
                                    onChange={(e) => setNewEnvironment({...newEnvironment, description: e.target.value})}
                                    className='form-input'
                                    placeholder='Brief description of this environment'
                                />
                            </div>
                            
                            <div className='form-group'>
                                <label className='form-label'>System Prompt</label>
                                <div className='form-hint'>
                                    Write your instructions naturally. The context and student question will be automatically included.
                                </div>
                                <textarea
                                    value={newEnvironment.system_prompt}
                                    onChange={(e) => setNewEnvironment({...newEnvironment, system_prompt: e.target.value})}
                                    className='form-textarea'
                                    placeholder='e.g., You are a helpful psychology tutor. Always provide clear explanations and examples...'
                                    required
                                />
                            </div>
                            
                            <div className='form-group'>
                                <label className='form-label'>Temperature</label>
                                <div className='form-hint'>
                                    Lower = more focused, Higher = more creative (0.0 - 2.0)
                                </div>
                                <input
                                    type='number'
                                    min='0'
                                    max='2'
                                    step='0.1'
                                    value={newEnvironment.model_config.temperature}
                                    onChange={(e) => setNewEnvironment({...newEnvironment, model_config: {...newEnvironment.model_config, temperature: parseFloat(e.target.value)}})}
                                    className='form-input form-input-number'
                                />
                            </div>
                        </div>
                        
                        <div className='form-actions'>
                            <button type='submit' className='btn btn-success'>
                                Create Environment
                            </button>
                            <button type='button' onClick={() => setShowCreateForm(false)} className='btn btn-secondary'>
                                Cancel
                            </button>
                        </div>
                    </form>

                    {/* Example Prompts Section */}
                    <div className='examples-section'>
                        <h4 className='examples-title'>Example Prompts for Inspiration</h4>
                        <div className='examples-grid'>
                            {examplePrompts.map((example, index) => (
                                <div key={index} className='example-card'>
                                    <h5 className='example-name'>{example.name}</h5>
                                    <p className='example-prompt'>{example.prompt}</p>
                                    <button
                                        type='button'
                                        onClick={() => setNewEnvironment({...newEnvironment, system_prompt: example.prompt})}
                                        className='btn btn-example'
                                    >
                                        Use This Prompt
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            <div className='environments-list'>
                {environments.length === 0 ? (
                    <p className='empty-state'>No environments created yet</p>
                ) : (
                    environments.map(env => (
                        <div
                            key={env.id}
                            className={`environment-item ${selectedEnvironment?.id === env.id ? 'selected': ''}`}
                            onClick={() => onEnvironmentSelect(env)}
                        >
                            <div className='environment-content'>
                                <div className='environment-info'>
                                    <h4 className='environment-name'>{env.name}</h4>
                                    {env.description && (
                                        <p className='environment-description'>{env.description}</p>
                                    )}
                                    <details className='prompt-details'>
                                        <summary className='prompt-summary'>
                                            View System Prompt
                                        </summary>
                                        <div className='prompt-content'>
                                            {env.system_prompt}
                                        </div>
                                    </details>
                                    <p className='environment-meta'>
                                        Created by: <span className='creator-email'>{env.created_by_email || 'Unknown'}</span> on {new Date(env.created_at).toLocaleDateString()}
                                    </p>
                                </div>
                                
                                <div className='environment-actions'>
                                    {env.can_delete ? (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                deleteEnvironment(env.id)
                                            }}
                                            className='btn btn-delete'
                                        >
                                            Delete
                                        </button>
                                    ) : (
                                        <div className='creator-only-badge'>
                                            Creator only
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    )
}

export default SandboxManager