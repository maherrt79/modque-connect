import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/context/AuthContext';
import { getUserProfile, createAnnouncement, getAnnouncements, deleteAnnouncement } from '@/services/db';
import { format } from 'date-fns';

export default function Announcements() {
    const { user } = useAuth();
    const router = useRouter();
    const [mosqueId, setMosqueId] = useState(null);
    const [message, setMessage] = useState('');
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
        if (!message.trim()) return;

        setSending(true);
        try {
            await createAnnouncement(mosqueId, message);
            setMessage('');
            // Refresh list
            const msgs = await getAnnouncements(mosqueId);
            setHistory(msgs);
            alert('Announcement sent!');
        } catch (error) {
            console.error(error);
            alert('Error sending announcement');
        } finally {
            setSending(false);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Are you sure you want to delete this announcement?')) return;
        try {
            await deleteAnnouncement(mosqueId, id);
            // Refresh list
            const msgs = await getAnnouncements(mosqueId);
            setHistory(msgs);
        } catch (error) {
            console.error(error);
            alert('Error deleting announcement');
        }
    };

    if (loading) return <div className="container" style={{ padding: '2rem' }}>Loading...</div>;

    return (
        <div className="container" style={{ padding: '2rem 1rem', maxWidth: '800px' }}>
            <h1 style={{ fontSize: '2rem', marginBottom: '2rem' }}>Manage Announcements</h1>

            <div className="card" style={{ marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>New Announcement</h2>
                <form onSubmit={handleSend}>
                    <textarea
                        className="input"
                        rows="3"
                        placeholder="Write a message to your followers..."
                        value={message}
                        onChange={e => setMessage(e.target.value)}
                        required
                    />
                    <button type="submit" className="btn btn-primary" disabled={sending}>
                        {sending ? 'Sending...' : 'Post Announcement'}
                    </button>
                </form>
            </div>

            <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>History</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {history.length === 0 ? (
                    <p style={{ color: 'var(--muted-foreground)' }}>No announcements yet.</p>
                ) : (
                    history.map(msg => (
                        <div key={msg.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                            <div>
                                <p style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>{msg.message}</p>
                                <p style={{ fontSize: '0.8rem', color: 'var(--muted-foreground)' }}>
                                    {format(new Date(msg.createdAt), 'PPP p')}
                                </p>
                            </div>
                            <button
                                onClick={() => handleDelete(msg.id)}
                                className="btn"
                                style={{ color: 'red', padding: '0.25rem 0.5rem', fontSize: '0.8rem', border: '1px solid red' }}
                            >
                                Delete
                            </button>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
