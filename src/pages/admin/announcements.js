import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/context/AuthContext';
import { getUserProfile, createAnnouncement, getAnnouncements, deleteAnnouncement } from '@/services/db';
import { format } from 'date-fns';

export default function Announcements() {
    const { user } = useAuth();
    const router = useRouter();
    const [mosqueId, setMosqueId] = useState(null);
    const [formData, setFormData] = useState({
        title: '',
        content: '',
        type: 'general',
        isPinned: false
    });
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);

    useEffect(() => {
        if (!user || !router.isReady) return;

        const { mosqueId: queryMosqueId } = router.query;
        if (!queryMosqueId) {
            router.push('/admin/dashboard');
            return;
        }

        getUserProfile(user.uid).then(async (profile) => {
            if (profile?.adminMosqueIds?.includes(queryMosqueId)) {
                setMosqueId(queryMosqueId);
                // Load history
                const msgs = await getAnnouncements(queryMosqueId);
                setHistory(msgs);
            } else {
                alert("Unauthorized");
                router.push('/admin/dashboard');
            }
            setLoading(false);
        });
    }, [user, router.isReady, router.query]);

    const handleSend = async (e) => {
        e.preventDefault();
        if (!formData.title.trim() || !formData.content.trim()) return;

        setSending(true);
        try {
            await createAnnouncement(mosqueId, formData);
            setFormData({
                title: '',
                content: '',
                type: 'general',
                isPinned: false
            });
            // Refresh list
            const msgs = await getAnnouncements(mosqueId);
            setHistory(msgs);
            alert('Notice posted!');
        } catch (error) {
            console.error(error);
            alert('Error posting notice');
        } finally {
            setSending(false);
        }
    };

    const [deleteId, setDeleteId] = useState(null);

    const handleDeleteClick = (id) => {
        setDeleteId(id);
    };

    const confirmDelete = async () => {
        if (!deleteId) return;
        try {
            await deleteAnnouncement(mosqueId, deleteId);
            // Refresh list
            const msgs = await getAnnouncements(mosqueId);
            setHistory(msgs);
        } catch (error) {
            console.error(error);
            alert('Error deleting notice');
        } finally {
            setDeleteId(null);
        }
    };

    const getTypeColor = (type) => {
        switch (type) {
            case 'alert': return 'red';
            case 'event': return 'blue';
            case 'jummah': return 'green';
            default: return 'gray';
        }
    };

    if (loading) return <div className="container" style={{ padding: '2rem' }}>Loading...</div>;

    return (
        <div className="container" style={{ padding: '2rem 1rem', maxWidth: '800px' }}>
            <h1 style={{ fontSize: '2rem', marginBottom: '2rem' }}>Digital Notice Board</h1>

            <div className="card" style={{ marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>New Notice</h2>
                <form onSubmit={handleSend} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Title</label>
                        <input
                            className="input"
                            type="text"
                            placeholder="e.g., Eid Prayer Timing"
                            value={formData.title}
                            onChange={e => setFormData({ ...formData, title: e.target.value })}
                            required
                        />
                    </div>

                    <div style={{ display: 'flex', gap: '1rem' }}>
                        <div style={{ flex: 1 }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Type</label>
                            <select
                                className="input"
                                value={formData.type}
                                onChange={e => setFormData({ ...formData, type: e.target.value })}
                            >
                                <option value="general">General</option>
                                <option value="event">Event</option>
                                <option value="alert">Alert</option>
                                <option value="jummah">Jummah</option>
                            </select>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', paddingTop: '1.5rem' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                                <input
                                    type="checkbox"
                                    checked={formData.isPinned}
                                    onChange={e => setFormData({ ...formData, isPinned: e.target.checked })}
                                />
                                Pin to Top
                            </label>
                        </div>
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Content</label>
                        <textarea
                            className="input"
                            rows="4"
                            placeholder="Write the details here..."
                            value={formData.content}
                            onChange={e => setFormData({ ...formData, content: e.target.value })}
                            required
                        />
                    </div>

                    <button type="submit" className="btn btn-primary" disabled={sending}>
                        {sending ? 'Posting...' : 'Post Notice'}
                    </button>
                </form>
            </div>

            <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Active Notices</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {history.length === 0 ? (
                    <p style={{ color: 'var(--muted-foreground)' }}>No notices yet.</p>
                ) : (
                    history.map(msg => (
                        <div key={msg.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', borderLeft: `4px solid ${getTypeColor(msg.type)}` }}>
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                                    {msg.isPinned && <span style={{ fontSize: '0.7rem', background: 'var(--gold-100)', color: 'var(--gold-800)', padding: '0.1rem 0.3rem', borderRadius: '4px' }}>PINNED</span>}
                                    <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--muted-foreground)', fontWeight: '600' }}>{msg.type}</span>
                                </div>
                                <h3 style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '0.25rem' }}>{msg.title || 'Untitled'}</h3>
                                <p style={{ fontSize: '1rem', marginBottom: '0.5rem', whiteSpace: 'pre-wrap' }}>{msg.content || msg.message}</p>
                                <p style={{ fontSize: '0.8rem', color: 'var(--muted-foreground)' }}>
                                    {format(new Date(msg.createdAt), 'PPP p')}
                                </p>
                            </div>
                            <button
                                onClick={() => handleDeleteClick(msg.id)}
                                className="btn"
                                style={{ color: 'red', padding: '0.25rem 0.5rem', fontSize: '0.8rem', border: '1px solid red' }}
                            >
                                Delete
                            </button>
                        </div>
                    ))
                )}
            </div>

            {deleteId && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000
                }}>
                    <div className="card" style={{ maxWidth: '400px', width: '90%', padding: '2rem' }}>
                        <h3 style={{ fontSize: '1.25rem', marginBottom: '1rem', color: 'var(--destructive)' }}>Delete Notice?</h3>
                        <p style={{ marginBottom: '1.5rem' }}>
                            Are you sure you want to delete this notice? This action cannot be undone.
                        </p>
                        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                            <button
                                onClick={() => setDeleteId(null)}
                                className="btn"
                                style={{ backgroundColor: 'var(--muted)', color: 'var(--foreground)' }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmDelete}
                                className="btn"
                                style={{ backgroundColor: 'var(--destructive)', color: 'white' }}
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
