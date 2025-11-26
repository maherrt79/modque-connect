import { useAuth } from '@/context/AuthContext';
import { getMosques, getUserProfile, getMosquesByIds } from '@/services/db';
import Link from 'next/link';
import { useEffect, useState } from 'react';

export default function Home() {
    const { user, logout } = useAuth();
    const [allMosques, setAllMosques] = useState([]);
    const [followedMosques, setFollowedMosques] = useState([]);
    const [followingIds, setFollowingIds] = useState([]);

    useEffect(() => {
        // Load all mosques for discovery
        getMosques().then(setAllMosques);

        // Load user profile to see following
        if (user) {
            getUserProfile(user.uid).then(async (profile) => {
                if (profile?.following && profile.following.length > 0) {
                    setFollowingIds(profile.following);
                    const followedData = await getMosquesByIds(profile.following);
                    setFollowedMosques(followedData);
                }
            });
        }
    }, [user]);

    return (
        <div className="container" style={{ padding: '2rem 1rem' }}>
            <main>
                {/* Hero Section */}
                <section style={{ textAlign: 'center', padding: '4rem 0', marginBottom: '3rem', backgroundImage: 'radial-gradient(var(--emerald-50) 1px, transparent 1px)', backgroundSize: '30px 30px' }}>
                    <h1 style={{ fontSize: '3.5rem', marginBottom: '1rem', color: 'var(--emerald-950)' }}>
                        <span className="crescent" style={{ fontSize: '3rem', marginRight: '0.5rem' }}>☪</span>
                        Mosque Connect
                    </h1>
                    <p style={{ fontSize: '1.25rem', color: 'var(--muted-foreground)', maxWidth: '600px', margin: '0 auto' }}>
                        Find prayer times, join your local community, and stay connected with your mosque.
                    </p>
                </section>
                {/* Followed Mosques Section */}
                {user && followedMosques.length > 0 && (
                    <section style={{ marginBottom: '3rem' }}>
                        <h2 style={{ fontSize: '2rem', marginBottom: '1.5rem', color: 'var(--emerald-900)' }}>Your Mosques</h2>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
                            {followedMosques.map(mosque => (
                                <Link href={`/mosque/${mosque.id}`} key={mosque.id} style={{ display: 'block' }}>
                                    <div className="card glass-panel" style={{ height: '100%', border: '1px solid var(--primary)', position: 'relative', overflow: 'hidden' }}>
                                        <div style={{ position: 'absolute', top: 0, right: 0, width: '60px', height: '60px', background: 'var(--emerald-50)', borderRadius: '0 0 0 100%', zIndex: 0 }}></div>
                                        <h3 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '0.5rem', position: 'relative', zIndex: 1 }}>{mosque.name}</h3>
                                        <p style={{ color: 'var(--muted-foreground)', position: 'relative', zIndex: 1 }}>{mosque.address}</p>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </section>
                )}

                {/* All Mosques Section */}
                <section style={{ marginBottom: '3rem' }}>
                    <h2 style={{ fontSize: '2rem', marginBottom: '1.5rem', color: 'var(--emerald-900)' }}>Find a Mosque</h2>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
                        {allMosques.map(mosque => (
                            <Link href={`/mosque/${mosque.id}`} key={mosque.id} style={{ display: 'block' }}>
                                <div className="card glass-panel" style={{ height: '100%', transition: 'all 0.3s ease' }}>
                                    <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '0.5rem', color: 'var(--foreground)' }}>{mosque.name}</h3>
                                    <p style={{ color: 'var(--muted-foreground)', marginBottom: '1rem', fontSize: '0.9rem' }}>{mosque.address}</p>
                                    {followingIds.includes(mosque.id) && (
                                        <span style={{
                                            backgroundColor: 'var(--secondary)',
                                            color: 'var(--secondary-foreground)',
                                            padding: '0.25rem 0.75rem',
                                            borderRadius: '999px',
                                            fontSize: '0.75rem',
                                            fontWeight: 'bold',
                                            display: 'inline-block'
                                        }}>
                                            Following
                                        </span>
                                    )}
                                </div>
                            </Link>
                        ))}
                    </div>
                </section>

                {user && (
                    <section>
                        <div style={{ marginTop: '2rem', padding: '2rem', background: 'var(--muted)', borderRadius: 'var(--radius)' }}>
                            <h3>Mosque Admin</h3>
                            <p style={{ marginBottom: '1rem' }}>Manage your mosques and prayer times.</p>
                            <Link href="/admin/dashboard" className="btn btn-primary">Go to Admin Dashboard</Link>
                        </div>
                    </section>
                )}
            </main>
        </div>
    );
}
