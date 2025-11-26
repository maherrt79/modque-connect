import { useState } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/context/AuthContext';
import { createMosqueProfile } from '@/services/db';

export default function CreateMosque() {
    const { user } = useAuth();
    const router = useRouter();
    const [formData, setFormData] = useState({
        name: '',
        address: '',
        description: ''
    });
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!user) return;

        setLoading(true);
        try {
            const mosqueId = await createMosqueProfile(user.uid, formData);
            router.push(`/mosque/${mosqueId}`);
        } catch (error) {
            console.error(error);
            alert('Error creating mosque profile');
        } finally {
            setLoading(false);
        }
    };

    if (!user) return <div className="container" style={{ padding: '2rem' }}>Please login first.</div>;

    return (
        <div className="container" style={{ padding: '2rem 1rem', maxWidth: '600px' }}>
            <h1 style={{ fontSize: '2rem', marginBottom: '2rem' }}>Register New Mosque</h1>

            <form onSubmit={handleSubmit} className="card">
                <div style={{ marginBottom: '1.5rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>Mosque Name</label>
                    <input
                        type="text"
                        className="input"
                        required
                        value={formData.name}
                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                        placeholder="e.g. Al-Noor Mosque"
                    />
                </div>

                <div style={{ marginBottom: '1.5rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>Address</label>
                    <input
                        type="text"
                        className="input"
                        required
                        value={formData.address}
                        onChange={e => setFormData({ ...formData, address: e.target.value })}
                        placeholder="123 Main St, City"
                    />
                </div>

                <div style={{ marginBottom: '1.5rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>Description</label>
                    <textarea
                        className="input"
                        rows="4"
                        value={formData.description}
                        onChange={e => setFormData({ ...formData, description: e.target.value })}
                        placeholder="Brief description about the mosque..."
                    />
                </div>

                <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
                    {loading ? 'Creating...' : 'Create Profile'}
                </button>
            </form>
        </div>
    );
}
