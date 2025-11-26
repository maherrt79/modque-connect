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

    useEffect(() => {
        if (!user) return;

        getUserProfile(user.uid).then(async (profile) => {
            if (profile?.adminMosqueIds && profile.adminMosqueIds.length > 0) {
                const mosquesData = await getMosquesByIds(profile.adminMosqueIds);
                setMosques(mosquesData);
            }
            setLoading(false);
        });
    }, [user]);

    if (!user) {
        if (typeof window !== 'undefined') router.push('/login');
        return null;
    }

    return (
        <div className="container" style={{ padding: '2rem 1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h1 style={{ fontSize: '2.5rem', fontWeight: 'bold', color: 'var(--emerald-950)' }}>Mosque Admin</h1>
                <Link href="/admin/create" className="btn btn-primary" style={{ padding: '0.75rem 1.5rem', fontSize: '1rem' }}>
                    + Register New Mosque
                </Link>
            </div>

            {loading ? (
                <p>Loading...</p>
            ) : mosques.length === 0 ? (
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
                                <Link href={`/mosque/${mosque.id}`} className="btn btn-primary" style={{ width: '100%', textAlign: 'center', fontSize: '1rem', padding: '0.75rem' }}>
                                    Manage Mosque
                                </Link>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
