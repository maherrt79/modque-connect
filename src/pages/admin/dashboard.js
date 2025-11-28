import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getUserProfile, getMosquesByIds } from '@/services/db';
import Link from 'next/link';
import { useRouter } from 'next/router';

export default function AdminDashboard() {
    const { user } = useAuth();
    const router = useRouter();
    const [mosques, setMosques] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedMosque, setSelectedMosque] = useState(null);

    useEffect(() => {
        if (!user || !router.isReady) return;

        getUserProfile(user.uid).then(async (profile) => {
            if (profile?.adminMosqueIds && profile.adminMosqueIds.length > 0) {
                const mosquesData = await getMosquesByIds(profile.adminMosqueIds);
                setMosques(mosquesData);

                // Check for mosqueId in query
                const { mosqueId } = router.query;
                if (mosqueId) {
                    const found = mosquesData.find(m => m.id === mosqueId);
                    if (found) setSelectedMosque(found);
                }
            }
            setLoading(false);
        });
    }, [user, router.isReady, router.query]);

    if (!user) {
        if (typeof window !== 'undefined') router.push('/login');
        return null;
    }

    if (loading) return <div className="container" style={{ padding: '2rem' }}>Loading...</div>;

    // Control Panel View
    if (selectedMosque) {
        return (
            <div className="container" style={{ padding: '2rem 1rem' }}>
                <div style={{ marginBottom: '2rem' }}>
                    <button
                        onClick={() => {
                            setSelectedMosque(null);
                            router.push('/admin/dashboard', undefined, { shallow: true });
                        }}
                        className="btn"
                        style={{ marginBottom: '1rem', color: 'var(--muted-foreground)', padding: 0 }}
                    >
                        ← Back to Mosques
                    </button>
                    <h1 style={{ fontSize: '2.5rem', fontWeight: 'bold', color: 'var(--emerald-950)' }}>{selectedMosque.name}</h1>
                    <p style={{ color: 'var(--muted-foreground)' }}>Admin Dashboard</p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }}>
                    <Link href={`/admin/edit?mosqueId=${selectedMosque.id}`} className="card glass-panel hover-card" style={{ textDecoration: 'none', color: 'inherit' }}>
                        <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', color: 'var(--emerald-800)' }}>Edit Profile</h3>
                        <p style={{ color: 'var(--muted-foreground)', fontSize: '0.9rem' }}>Update name, address, description, and social links.</p>
                    </Link>

                    <Link href={`/admin/timetable?mosqueId=${selectedMosque.id}`} className="card glass-panel hover-card" style={{ textDecoration: 'none', color: 'inherit' }}>
                        <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', color: 'var(--emerald-800)' }}>Manage Timetable</h3>
                        <p style={{ color: 'var(--muted-foreground)', fontSize: '0.9rem' }}>Update prayer times and Jummah schedules.</p>
                    </Link>

                    <Link href={`/admin/announcements?mosqueId=${selectedMosque.id}`} className="card glass-panel hover-card" style={{ textDecoration: 'none', color: 'inherit' }}>
                        <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', color: 'var(--emerald-800)' }}>Digital Notice Board</h3>
                        <p style={{ color: 'var(--muted-foreground)', fontSize: '0.9rem' }}>Post alerts, events, and general announcements.</p>
                    </Link>

                    <Link href={`/mosque/${selectedMosque.id}`} className="card glass-panel hover-card" style={{ textDecoration: 'none', color: 'inherit', border: '1px solid var(--emerald-200)' }}>
                        <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', color: 'var(--emerald-800)' }}>View Public Page</h3>
                        <p style={{ color: 'var(--muted-foreground)', fontSize: '0.9rem' }}>See how your mosque looks to visitors.</p>
                    </Link>
                </div>
            </div>
        );
    }

    // List View
    return (
        <div className="container" style={{ padding: '2rem 1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h1 style={{ fontSize: '2.5rem', fontWeight: 'bold', color: 'var(--emerald-950)' }}>Mosque Admin</h1>
                <Link href="/admin/create" className="btn btn-primary" style={{ padding: '0.75rem 1.5rem', fontSize: '1rem' }}>
                    + Register New Mosque
                </Link>
            </div>

            {mosques.length === 0 ? (
                <div className="card glass-panel" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
                    <p style={{ marginBottom: '1.5rem', fontSize: '1.25rem', color: 'var(--muted-foreground)' }}>You don't manage any mosques yet.</p>
                    <Link href="/admin/create" className="btn btn-primary">Get Started</Link>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '2rem' }}>
                    {mosques.map(mosque => (
                        <div key={mosque.id} className="card glass-panel" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                            <div style={{ flex: 1 }}>
                                <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '0.5rem', color: 'var(--emerald-900)' }}>{mosque.name}</h2>
                                <p style={{ color: 'var(--muted-foreground)', marginBottom: '1.5rem', fontSize: '0.95rem' }}>{mosque.address}</p>
                            </div>

                            <div style={{ marginTop: 'auto' }}>
                                <button
                                    onClick={() => {
                                        setSelectedMosque(mosque);
                                        router.push(`/admin/dashboard?mosqueId=${mosque.id}`, undefined, { shallow: true });
                                    }}
                                    className="btn btn-primary"
                                    style={{ width: '100%', textAlign: 'center', fontSize: '1rem', padding: '0.75rem' }}
                                >
                                    Manage Mosque
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
