import Head from 'next/head';

import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { getMosqueById, getTimetable, followMosque, unfollowMosque, getUserProfile, subscribeToAnnouncements } from '@/services/db';
import { useAuth } from '@/context/AuthContext';
import { format, addDays, subDays, isSameMonth, isSameDay } from 'date-fns';

const SkeletonLoader = () => (
    <div className="animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-3/4 mb-4"></div>
        <div className="h-4 bg-gray-200 rounded w-1/2 mb-6"></div>
        <div className="h-64 bg-gray-200 rounded mb-6"></div>
    </div>
);

export default function MosqueProfile() {
    const router = useRouter();
    const { id } = router.query;
    const { user } = useAuth();

    const [mosque, setMosque] = useState(null);
    const [timetable, setTimetable] = useState([]);
    const [announcements, setAnnouncements] = useState([]);
    const [isFollowing, setIsFollowing] = useState(false);
    const [isAdmin, setIsAdmin] = useState(false);

    // View State
    const [currentDate, setCurrentDate] = useState(new Date());
    const [viewMode, setViewMode] = useState('today'); // 'today' or 'weekly'
    const [nextPrayer, setNextPrayer] = useState(null);
    const [timeRemaining, setTimeRemaining] = useState('');

    const isFriday = currentDate.getDay() === 5;

    // Get times for the currently selected date
    const currentDayTimes = timetable.find(d => d.date === format(currentDate, 'yyyy-MM-dd'));

    // Helper to get next prayer
    const getNextPrayer = (times) => {
        if (!times) return null;
        const now = new Date();
        const prayerNames = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];

        for (const prayer of prayerNames) {
            const timeStr = times[prayer.toLowerCase()];
            if (!timeStr) continue;

            const [time, modifier] = timeStr.split(' ');
            let [hours, minutes] = time.split(':');

            if (modifier === 'PM' && hours !== '12') hours = parseInt(hours) + 12;
            if (modifier === 'AM' && hours === '12') hours = 0;

            const prayerDate = new Date();
            prayerDate.setHours(hours, minutes, 0);

            if (prayerDate > now) {
                return { name: prayer, time: prayerDate };
            }
        }
        // If all passed, next is Fajr tomorrow (simplified for now)
        return { name: 'Fajr', time: null, isTomorrow: true };
    };

    useEffect(() => {
        if (currentDayTimes) {
            const next = getNextPrayer(currentDayTimes);
            setNextPrayer(next);
        }
    }, [currentDayTimes]);

    // Countdown Timer
    useEffect(() => {
        if (!nextPrayer || !nextPrayer.time) return;

        const timer = setInterval(() => {
            const now = new Date();
            const diff = nextPrayer.time - now;

            if (diff <= 0) {
                setTimeRemaining('Now');
                // Trigger refresh or re-check
            } else {
                const hours = Math.floor(diff / (1000 * 60 * 60));
                const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                const seconds = Math.floor((diff % (1000 * 60)) / 1000);
                setTimeRemaining(`${hours}h ${minutes}m ${seconds}s`);
            }
        }, 1000);

        return () => clearInterval(timer);
    }, [nextPrayer]);

    useEffect(() => {
        if (!id) return;

        // Load Mosque Data
        getMosqueById(id).then(setMosque);

        // Subscribe to Announcements (Real-time)
        const unsubscribe = subscribeToAnnouncements(id, (data) => {
            setAnnouncements(data);
        });

        // Check if following & admin status
        if (user) {
            getUserProfile(user.uid).then(profile => {
                if (profile?.following?.includes(id)) {
                    setIsFollowing(true);
                }
                if (profile?.adminMosqueIds?.includes(id)) {
                    setIsAdmin(true);
                }
            });
        }

        return () => unsubscribe();
    }, [id, user]);

    // Fetch Timetable when ID or Month changes
    useEffect(() => {
        if (!id) return;
        const currentMonth = format(currentDate, 'yyyy-MM');
        getTimetable(id, currentMonth).then(setTimetable);
    }, [id, currentDate]);

    const handleFollow = async () => {
        if (!user) return router.push('/login');
        if (isFollowing) {
            await unfollowMosque(user.uid, id);
            setIsFollowing(false);
        } else {
            await followMosque(user.uid, id);
            setIsFollowing(true);
        }
    };

    const handleShare = () => {
        if (navigator.share) {
            navigator.share({
                title: mosque.name,
                text: `Check out ${mosque.name} on Mosque Connect`,
                url: window.location.href,
            });
        } else {
            navigator.clipboard.writeText(window.location.href);
            alert('Link copied to clipboard!');
        }
    };

    const openMap = () => {
        const query = encodeURIComponent(`${mosque.name} ${mosque.address}`);
        window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, '_blank');
    };



    if (!mosque) return (
        <div className="container" style={{ padding: '2rem' }}>
            <SkeletonLoader />
        </div>
    );

    return (
        <div className="container" style={{ padding: '2rem 1rem' }}>
            <Head>
                <title>{mosque.name} | Mosque Connect</title>
                <meta name="description" content={`Prayer times and announcements for ${mosque.name}. ${mosque.address}`} />
                <meta property="og:title" content={mosque.name} />
                <meta property="og:description" content={`Prayer times and announcements for ${mosque.name}`} />
            </Head>

            {/* Admin Toolbar */}
            {isAdmin && (
                // ... (keep existing admin toolbar)
                <div className="card" style={{ marginBottom: '2rem', background: 'var(--primary)', color: 'white', border: 'none' }}>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span>🛠️</span> Admin Controls
                    </h2>
                    <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                        <button
                            onClick={() => router.push(`/admin/timetable?mosqueId=${id}`)}
                            className="btn"
                            style={{ background: 'white', color: 'var(--primary)', border: 'none', fontWeight: '600' }}
                        >
                            📅 Edit Timetable & Jummah
                        </button>
                        <button
                            onClick={() => router.push(`/admin/announcements?mosqueId=${id}`)}
                            className="btn"
                            style={{ background: 'white', color: 'var(--primary)', border: 'none', fontWeight: '600' }}
                        >
                            📢 Send Announcement
                        </button>
                        <button
                            onClick={() => router.push(`/admin/edit?mosqueId=${id}`)}
                            className="btn"
                            style={{ background: 'white', color: 'var(--primary)', border: 'none', fontWeight: '600' }}
                        >
                            ✏️ Edit Profile
                        </button>
                    </div>
                </div>
            )}

            <div className="card glass-panel" style={{ marginBottom: '2rem', textAlign: 'center', padding: '3rem 1rem', backgroundImage: 'radial-gradient(var(--emerald-50) 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
                <h1 style={{ fontSize: '3rem', fontWeight: 'bold', marginBottom: '0.5rem', color: 'var(--emerald-950)' }}>{mosque.name}</h1>
                <p style={{ fontSize: '1.1rem', color: 'var(--muted-foreground)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
                    📍 {mosque.address}
                    <button onClick={openMap} style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', textDecoration: 'underline', fontSize: '0.9rem' }}>
                        (Open Map)
                    </button>
                </p>

                <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginBottom: '2rem' }}>
                    <button
                        onClick={handleShare}
                        className="btn btn-secondary"
                        title="Share"
                    >
                        📤 Share
                    </button>
                    <button
                        onClick={handleFollow}
                        className={`btn ${isFollowing ? 'btn-secondary' : 'btn-primary'} `}
                    >
                        {isFollowing ? 'Unfollow' : 'Follow Mosque'}
                    </button>
                </div>

                {/* Next Prayer Countdown */}
                {nextPrayer && !nextPrayer.isTomorrow && (
                    <div style={{ background: 'var(--emerald-900)', color: 'white', display: 'inline-block', padding: '1rem 2rem', borderRadius: '1rem', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}>
                        <div style={{ fontSize: '0.9rem', opacity: 0.9, marginBottom: '0.25rem' }}>Next Prayer: {nextPrayer.name}</div>
                        <div style={{ fontSize: '2rem', fontWeight: 'bold', fontFamily: 'monospace' }}>{timeRemaining || '--:--:--'}</div>
                    </div>
                )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
                {/* Prayer Times Section */}
                <div className="card glass-panel">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
                        <h2 style={{ fontSize: '1.5rem', margin: 0 }}>
                            Prayer Times
                        </h2>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button
                                onClick={() => { setViewMode('today'); setCurrentDate(new Date()); }}
                                className={`btn ${viewMode === 'today' ? 'btn-primary' : 'btn-secondary'}`}
                                style={{ padding: '0.25rem 0.75rem', fontSize: '0.9rem' }}
                            >
                                Day View
                            </button>
                            <button
                                onClick={() => setViewMode('weekly')}
                                className={`btn ${viewMode === 'weekly' ? 'btn-primary' : 'btn-secondary'}`}
                                style={{ padding: '0.25rem 0.75rem', fontSize: '0.9rem' }}
                            >
                                Weekly
                            </button>
                        </div>
                    </div>

                    {viewMode === 'today' ? (
                        <>
                            {/* Day Navigation */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                                <button onClick={() => setCurrentDate(subDays(currentDate, 1))} className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem' }}>&larr; Prev</button>
                                <div style={{ textAlign: 'center' }}>
                                    <div style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{format(currentDate, 'EEEE')}</div>
                                    <div style={{ color: 'var(--muted-foreground)' }}>{format(currentDate, 'MMMM d, yyyy')}</div>
                                </div>
                                <button onClick={() => setCurrentDate(addDays(currentDate, 1))} className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem' }}>Next &rarr;</button>
                            </div>

                            {currentDayTimes ? (
                                <>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '1.5rem' }}>
                                        <thead>
                                            <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left' }}>
                                                <th style={{ padding: '0.5rem', color: 'var(--muted-foreground)', fontWeight: '500' }}>Prayer</th>
                                                <th style={{ padding: '0.5rem', textAlign: 'right', color: 'var(--muted-foreground)', fontWeight: '500' }}>Adhan</th>
                                                <th style={{ padding: '0.5rem', textAlign: 'right', color: 'var(--primary)', fontWeight: '600' }}>Iqama</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'].map(prayer => {
                                                const isDhuhrOnFriday = isFriday && prayer === 'Dhuhr';
                                                let iqamaDisplay = currentDayTimes[prayer.toLowerCase() + 'Iqama'] || '-';
                                                const isNext = nextPrayer && nextPrayer.name === prayer && !nextPrayer.isTomorrow;

                                                // Replace Dhuhr Iqama with Jummah times on Friday
                                                if (isDhuhrOnFriday && mosque.jummahs && mosque.jummahs.length > 0) {
                                                    iqamaDisplay = mosque.jummahs.map(j => j.time).join(', ');
                                                }

                                                return (
                                                    <tr key={prayer} style={{
                                                        borderBottom: '1px solid var(--muted)',
                                                        backgroundColor: isNext ? 'var(--emerald-50)' : 'transparent',
                                                        transition: 'background-color 0.3s'
                                                    }}>
                                                        <td style={{ padding: '1rem 0.5rem', fontWeight: '600', color: isNext ? 'var(--emerald-900)' : 'inherit' }}>
                                                            {prayer}
                                                            {isNext && <span style={{ fontSize: '0.7rem', marginLeft: '0.5rem', background: 'var(--emerald-600)', color: 'white', padding: '0.1rem 0.4rem', borderRadius: '999px' }}>NEXT</span>}
                                                        </td>
                                                        <td style={{ padding: '1rem 0.5rem', textAlign: 'right', fontSize: '1.1rem' }}>
                                                            {currentDayTimes[prayer.toLowerCase()] || '-'}
                                                        </td>
                                                        <td style={{ padding: '1rem 0.5rem', textAlign: 'right', fontSize: '1.1rem', fontWeight: 'bold', color: 'var(--primary)' }}>
                                                            {iqamaDisplay}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>

                                    {/* Sunrise Display */}
                                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', padding: '1rem', background: 'var(--orange-50)', borderRadius: 'var(--radius)', marginBottom: '1rem', color: 'var(--orange-900)' }}>
                                        <span>☀️ Sunrise:</span>
                                        <span style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{currentDayTimes.sunrise || '-'}</span>
                                    </div>

                                    {/* Jummah Display (Only on Fridays) - Moved below table */}
                                    {isFriday && mosque.jummahs && mosque.jummahs.length > 0 && (
                                        <div style={{ padding: '1rem', background: 'var(--emerald-50)', borderRadius: 'var(--radius)', border: '1px solid var(--emerald-600)' }}>
                                            <h3 style={{ fontSize: '1.25rem', color: 'var(--emerald-900)', marginBottom: '0.5rem', fontWeight: 'bold', textAlign: 'center' }}>Jummah Prayers</h3>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                                {mosque.jummahs.map((j, idx) => (
                                                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: idx < mosque.jummahs.length - 1 ? '1px solid rgba(0,0,0,0.1)' : 'none', paddingBottom: idx < mosque.jummahs.length - 1 ? '0.5rem' : 0 }}>
                                                        <span style={{ fontWeight: '600', fontSize: '1.1rem' }}>{j.time}</span>
                                                        <span style={{ fontSize: '0.9rem', color: 'var(--emerald-800)' }}>{j.language}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--muted-foreground)' }}>
                                    No timetable available for this date.
                                </div>
                            )}
                        </>
                    ) : (
                        // Weekly View
                        // Weekly View
                        <div style={{ overflowX: 'auto', borderRadius: 'var(--radius)', border: '1px solid var(--border)', maxHeight: '600px' }}>
                            <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, minWidth: '800px' }}>
                                <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                                    <tr style={{ backgroundColor: 'var(--card)', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                                        <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '1px solid var(--border)', fontWeight: '600', color: 'var(--foreground)' }}>Date</th>
                                        {['Fajr', 'Sunrise', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'].map(p => (
                                            <th key={p} style={{ padding: '1rem', textAlign: 'center', borderBottom: '1px solid var(--border)', fontWeight: '600', color: 'var(--foreground)' }}>{p}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {timetable
                                        .filter(day => new Date(day.date) >= new Date(format(new Date(), 'yyyy-MM-dd')))
                                        .slice(0, 7)
                                        .map(day => {
                                            const dayDate = new Date(day.date);
                                            const isDayFriday = dayDate.getDay() === 5;
                                            const isToday = isSameDay(dayDate, new Date());

                                            let rowBackground = 'transparent';
                                            if (isToday) rowBackground = 'var(--blue-50)';
                                            else if (isDayFriday) rowBackground = 'var(--emerald-50)';

                                            return (
                                                <tr key={day.date} style={{ backgroundColor: rowBackground }}>
                                                    <td style={{ padding: '1rem', fontWeight: '500', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' }}>
                                                        <div style={{ fontWeight: 'bold' }}>{format(dayDate, 'EEEE')}</div>
                                                        <div style={{ fontSize: '0.85rem', color: 'var(--muted-foreground)' }}>{format(dayDate, 'MMM d')}</div>
                                                        {isToday && <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.5px', background: 'var(--primary)', color: 'white', padding: '0.1rem 0.4rem', borderRadius: '999px', marginTop: '0.25rem', display: 'inline-block' }}>Today</span>}
                                                    </td>
                                                    {['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'].map(p => (
                                                        <td key={p} style={{ padding: '1rem', textAlign: 'center', borderBottom: '1px solid var(--border)' }}>
                                                            <div style={{ fontSize: '1rem', fontWeight: '500' }}>{day[p]}</div>
                                                            <div style={{ fontSize: '0.85rem', color: 'var(--primary)', fontWeight: '600', marginTop: '0.25rem' }}>
                                                                {p === 'sunrise' ? '☀️' : (
                                                                    isDayFriday && p === 'dhuhr' && mosque.jummahs && mosque.jummahs.length > 0
                                                                        ? <span style={{ color: 'var(--emerald-700)' }}>Jummah</span>
                                                                        : day[p + 'Iqama']
                                                                )}
                                                            </div>
                                                        </td>
                                                    ))}
                                                </tr>
                                            );
                                        })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Info / Announcements */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                    {/* Announcements */}
                    {announcements.length > 0 && (
                        <div className="card" style={{ border: '1px solid var(--gold-400)', backgroundColor: 'var(--gold-100)' }}>
                            <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: 'var(--emerald-900)' }}>Announcements</h2>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                {announcements.map(msg => (
                                    <div key={msg.id} style={{ borderBottom: '1px solid rgba(0,0,0,0.1)', paddingBottom: '0.5rem' }}>
                                        <p style={{ fontWeight: '500' }}>{msg.message}</p>
                                        <p style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)', marginTop: '0.25rem' }}>
                                            {format(new Date(msg.createdAt), 'MMM d, p')}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="card">
                        <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem' }}>Information</h2>
                        <p>{mosque.description || "No additional information provided."}</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
