'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../../app/lib/supabaseClient'
import { useAuth } from '../../app/lib/authContext'
import './sandbox-manager.styles.css'

const SandboxManager = ({ onEnvironmentSelect, selectedEnvironment }) => {
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
            const { data, error } = await supabase
                .from('sandbox_environments')
                .select('*')
                .order('created_at', { ascending: false })

            if (error) {
                console.error('Error fetching environments:', error)
            } else {
                setEnvironments(data || [])
            }
        } catch (error) {
            console.error('Error in fetchEnvironments:', error)
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
            const { data, error } = await supabase
                .from('sandbox_environments')
                .insert([{
                    ...newEnvironment,
                    created_by: user.id
                }])
                .select()
                .single()

            if (error) {
                console.error('Error creating environment:', error)
                alert('Error creating environment')
            } else {
                setEnvironments([data, ...environments])
                setNewEnvironment({
                    name: '',
                    description: '',
                    system_prompt: '',
                    model_config: { temperature: 0.7 }
                })
                setShowCreateForm(false)
            }
        } catch (error) {
            console.error('Error in createEnvironment:', error)
            alert('Error creating environment')
        }
    }

    const deleteEnvironment = async (id) => {
        if (!confirm('Are you sure you want to delete this environment?')) return

        try {
            const { error } = await supabase
                .from('sandbox_environments')
                .delete()
                .eq('id', id)

            if (error) {
                console.error('Error deleting environment:', error)
                alert('Error deleting environment')
            } else {
                setEnvironments(environments.filter(env => env.id !== id))
                if (selectedEnvironment?.id === id) {
                    onEnvironmentSelect(null)
                }
            }
        } catch (error) {
            console.error('Error in deleteEnvironment:', error)
            alert('Error deleting environment')
        }
    }

    if (loading) return <div>Loading environments...</div>

    return (
        <div className='sandbox-manager'>
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
                <form onSubmit={createEnvironment} className='create-form'>
                    <div className='form-grid'>
                        <div className='form-group' >
                            <label className='form-label'>Environment Name</label>
                            <input
                                type='text'
                                value={newEnvironment.name}
                                onChange={(e) => setNewEnvironment({...newEnvironment, name: e.target.value})}
                                className='form-input'
                                placeholder='e.g., Short Lab Tutor'
                                required
                            />
                        </div>
                        <div className='form-group' >
                            <label className='form-label'>Description</label>
                            <input
                                type='text'
                                value={newEnvironment.description}
                                onChange={(e) => setNewEnvironment({...newEnvironment, description: e.target.value})}
                                className='form-input'
                                placeholder='Brief description of this environment'
                            />
                        </div>
                        <div className='form-group' >
                            <label className='form-label'>System Prompt</label>
                            <textarea
                                value={newEnvironment.system_prompt}
                                onChange={(e) => setNewEnvironment({...newEnvironment, system_prompt: e.target.value})}
                                className='form-textarea'
                                placeholder='Enter the system prompt to test...'
                                required
                            />
                        </div>
                        <div className='form-group' >
                            <label className='form-label'>Temperature</label>
                            <input
                                type='number'
                                min='0'
                                max='2'
                                step='0.1'
                                value={newEnvironment.model_config.temperature}
                                onChange={(e) => setNewEnvironment({...newEnvironment, model_config: {...newEnvironment.model_config, temperature: parseFloat(e.target.value)}})}
                                className='form-input'
                            />
                        </div>
                    </div>
                    <div className='form-actions'>
                        <button
                            type='submit'
                            className='btn btn-success'
                        >
                            Create Environment
                        </button>
                        <button
                            type='button'
                            onClick={() => setShowCreateForm(false)}
                            className='btn btn-secondary'
                        >
                            Cancel
                        </button>
                    </div>
                </form>
            )}

            <div className='environments-list'>
                {environments.length === 0 ? (
                    <p className='empty-state'>No environments created yet</p>
                ) : (
                    environments.map(env => (
                        <div
                            key={env.id}
                            className={`environment-item ${
                                selectedEnvironment?.id === env.id ? 'selected': ''}`}
                            onClick={() => onEnvironmentSelect(env)}
                        >
                            <div className='environment-content'>
                                <div className='environment-info'>
                                    <h4 className='environment-name'>{env.name}</h4>
                                    {env.description && (
                                        <p className='environment-description'>{env.description}</p>
                                    )}
                                    <p className='environment-date'>
                                        Created: {new Date(env.created_at).toLocaleDateString()}
                                    </p>
                                </div>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        deleteEnvironment(env.id)
                                    }}
                                    className='btn-delete'
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    )
}

export default SandboxManager