import Head from 'next/head';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { getMosqueById, getTimetable, followMosque, unfollowMosque, getUserProfile, subscribeToAnnouncements } from '@/services/db';
import { useAuth } from '@/context/AuthContext';
import { format, addDays, subDays, isSameMonth, isSameDay } from 'date-fns';
import { Bell, BellOff, Share2, MapPin, ExternalLink, Facebook, Instagram, Twitter, Youtube, Clock, Calendar, Globe, Settings, Copy, Navigation } from 'lucide-react';

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
    const todayTimes = timetable.find(d => d.date === format(new Date(), 'yyyy-MM-dd'));

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
        if (todayTimes) {
            const next = getNextPrayer(todayTimes);
            setNextPrayer(next);
        }
    }, [todayTimes]);

    // Countdown Timer
    useEffect(() => {
        if (!nextPrayer || !nextPrayer.time) return;

        const timer = setInterval(() => {
            const now = new Date();
            const diff = nextPrayer.time - now;

            if (diff <= 0) {
                setTimeRemaining('Now');
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

    const handleCopyAddress = () => {
        navigator.clipboard.writeText(mosque.address);
        alert('Address copied to clipboard!');
    };

    const formatTime = (timeStr) => {
        if (!timeStr) return '';
        // Assuming timeStr is "HH:mm" or "HH:mm AM/PM"
        return timeStr;
    };

    if (!mosque) return (
        <div className="container" style={{ padding: '2rem' }}>
            <SkeletonLoader />
        </div>
    );

    return (
        <div className="app-wrapper">
            <Head>
                <title>{mosque.name} | Mosque Profile</title>
            </Head>

            {/* Navbar would go here if imported */}

            <div className="main-content">
                {/* Hero Section */}
                <div className="hero-section">
                    <div className="hero-pattern"></div>
                    <div className="container" style={{ position: 'relative', zIndex: 1 }}>
                        <div className="animate-fade-in">
                            <h1 style={{ fontSize: '3rem', marginBottom: '1rem', color: 'var(--white)' }}>{mosque.name}</h1>
                            <p style={{ fontSize: '1.2rem', opacity: 0.9, maxWidth: '600px', margin: '0 auto' }}>
                                {mosque.description}
                            </p>
                        </div>

                        {nextPrayer && (
                            <div className="countdown-box animate-slide-up">
                                <div className="countdown-label">Next Prayer: {nextPrayer.name}</div>
                                <div className="countdown-time">{timeRemaining}</div>
                                <div style={{ fontSize: '0.9rem', marginTop: '0.5rem', opacity: 0.8 }}>
                                    Starts at {formatTime(nextPrayer.time ? format(nextPrayer.time, 'h:mm a') : '')}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="container">
                    <div className="profile-grid">
                        {/* Sidebar */}
                        <div className="animate-slide-up" style={{ animationDelay: '0.1s' }}>
                            <div style={{
                                background: 'var(--white)',
                                border: '1px solid var(--border)',
                                borderRadius: '16px',
                                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
                                overflow: 'hidden'
                            }}>
                                <div style={{ padding: '1.5rem' }}>
                                    {/* Primary Actions */}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '2rem' }}>
                                        {isAdmin && (
                                            <button
                                                onClick={() => router.push(`/admin/dashboard?mosqueId=${id}`)}
                                                className="btn"
                                                style={{
                                                    width: '100%',
                                                    background: 'var(--emerald-50)',
                                                    color: 'var(--emerald-800)',
                                                    border: '1px solid var(--emerald-200)',
                                                    borderRadius: '10px',
                                                    padding: '0.875rem',
                                                    fontWeight: '600',
                                                    fontSize: '0.95rem',
                                                    marginBottom: '0.5rem'
                                                }}
                                            >
                                                <Settings size={18} style={{ marginRight: '0.5rem' }} /> Manage Mosque
                                            </button>
                                        )}

                                        <div style={{ display: 'flex', gap: '0.75rem' }}>
                                            {isFollowing ? (
                                                <button
                                                    onClick={handleFollow}
                                                    className="btn"
                                                    style={{
                                                        flex: 1,
                                                        background: 'var(--white)',
                                                        color: 'var(--emerald-700)',
                                                        border: '2px solid var(--emerald-100)',
                                                        borderRadius: '10px',
                                                        fontWeight: '600'
                                                    }}
                                                >
                                                    <BellOff size={18} style={{ marginRight: '0.5rem' }} /> Following
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={handleFollow}
                                                    className="btn"
                                                    style={{
                                                        flex: 1,
                                                        background: 'var(--emerald-600)',
                                                        color: 'white',
                                                        border: 'none',
                                                        borderRadius: '10px',
                                                        fontWeight: '600',
                                                        boxShadow: '0 4px 12px rgba(5, 150, 105, 0.2)'
                                                    }}
                                                >
                                                    <Bell size={18} style={{ marginRight: '0.5rem' }} /> Follow
                                                </button>
                                            )}
                                            <button
                                                onClick={handleShare}
                                                className="btn"
                                                style={{
                                                    padding: '0 1rem',
                                                    background: 'var(--white)',
                                                    border: '1px solid var(--border)',
                                                    borderRadius: '10px',
                                                    color: 'var(--muted-foreground)'
                                                }}
                                            >
                                                <Share2 size={20} />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Connect Section */}
                                    <div>
                                        <h3 style={{
                                            fontSize: '0.75rem',
                                            textTransform: 'uppercase',
                                            letterSpacing: '1.5px',
                                            color: 'var(--muted-foreground)',
                                            marginBottom: '1.25rem',
                                            fontWeight: '700',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.5rem'
                                        }}>
                                            Connect
                                        </h3>

                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                            {mosque.website && (
                                                <a
                                                    href={mosque.website}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="btn"
                                                    style={{
                                                        width: '100%',
                                                        background: 'var(--background)',
                                                        color: 'var(--foreground)',
                                                        border: '1px solid var(--border)',
                                                        borderRadius: '10px',
                                                        justifyContent: 'space-between',
                                                        padding: '0.875rem 1rem',
                                                        fontWeight: '500',
                                                        fontSize: '0.95rem',
                                                        transition: 'all 0.2s'
                                                    }}
                                                    onMouseEnter={(e) => {
                                                        e.currentTarget.style.borderColor = 'var(--emerald-400)';
                                                        e.currentTarget.style.color = 'var(--emerald-700)';
                                                    }}
                                                    onMouseLeave={(e) => {
                                                        e.currentTarget.style.borderColor = 'var(--border)';
                                                        e.currentTarget.style.color = 'var(--foreground)';
                                                    }}
                                                >
                                                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                        <Globe size={16} /> Website
                                                    </span>
                                                    <ExternalLink size={14} style={{ opacity: 0.5 }} />
                                                </a>
                                            )}

                                            {/* Social Grid */}
                                            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                                                {[
                                                    { icon: Facebook, link: mosque.facebook, color: '#1877F2', label: 'Facebook' },
                                                    { icon: Instagram, link: mosque.instagram, color: '#E4405F', label: 'Instagram' },
                                                    { icon: Twitter, link: mosque.twitter, color: '#1DA1F2', label: 'Twitter' },
                                                    { icon: Youtube, link: mosque.youtube, color: '#FF0000', label: 'Youtube' }
                                                ].map((social, idx) => social.link && (
                                                    <a
                                                        key={idx}
                                                        href={social.link}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="social-btn"
                                                        style={{
                                                            width: '42px',
                                                            height: '42px',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            borderRadius: '50%',
                                                            background: 'var(--background)',
                                                            border: '1px solid var(--border)',
                                                            color: 'var(--muted-foreground)',
                                                            transition: 'all 0.2s ease'
                                                        }}
                                                        onMouseEnter={(e) => {
                                                            e.currentTarget.style.color = 'white';
                                                            e.currentTarget.style.borderColor = social.color;
                                                            e.currentTarget.style.background = social.color;
                                                            e.currentTarget.style.transform = 'translateY(-2px)';
                                                        }}
                                                        onMouseLeave={(e) => {
                                                            e.currentTarget.style.color = 'var(--muted-foreground)';
                                                            e.currentTarget.style.borderColor = 'var(--border)';
                                                            e.currentTarget.style.background = 'var(--background)';
                                                            e.currentTarget.style.transform = 'translateY(0)';
                                                        }}
                                                        title={social.label}
                                                    >
                                                        <social.icon size={18} strokeWidth={2} />
                                                    </a>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Main Content */}
                        <div className="animate-slide-up" style={{ animationDelay: '0.2s' }}>
                            {/* Prayer Times */}
                            <div className="glass-card" style={{ marginBottom: '2rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                                    <h2 style={{ fontSize: '1.5rem', margin: 0 }}>Prayer Times</h2>
                                    <div className="badge badge-emerald">
                                        <Calendar size={14} style={{ marginRight: '0.25rem' }} />
                                        {format(new Date(), 'EEEE, d MMMM')}
                                    </div>
                                </div>

                                {todayTimes ? (
                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                        {/* Header */}
                                        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', padding: '0.75rem 1rem', borderBottom: '1px solid var(--border)', color: 'var(--muted-foreground)', fontSize: '0.85rem', fontWeight: '600', textTransform: 'uppercase' }}>
                                            <div>Prayer</div>
                                            <div style={{ textAlign: 'center' }}>Adhan</div>
                                            <div style={{ textAlign: 'right' }}>Iqamah</div>
                                        </div>

                                        {/* Rows */}
                                        {['Fajr', 'Sunrise', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'].map((prayer) => {
                                            const key = prayer.toLowerCase();
                                            const time = todayTimes[key];
                                            const iqama = (todayTimes && prayer !== 'Sunrise') ? todayTimes[key + 'Iqama'] : null;
                                            const isNext = nextPrayer?.name === prayer;

                                            if (!time) return null;

                                            return (
                                                <div key={prayer} style={{
                                                    display: 'grid',
                                                    gridTemplateColumns: '1.2fr 1fr 1fr',
                                                    padding: '1rem',
                                                    alignItems: 'center',
                                                    backgroundColor: isNext ? 'var(--emerald-50)' : 'transparent',
                                                    borderLeft: isNext ? '4px solid var(--emerald-500)' : '4px solid transparent',
                                                    fontWeight: isNext ? '600' : 'normal',
                                                    borderBottom: '1px solid var(--border-light)'
                                                }}>
                                                    <div style={{ color: isNext ? 'var(--emerald-900)' : 'inherit' }}>{prayer}</div>
                                                    <div style={{ textAlign: 'center', color: isNext ? 'var(--emerald-900)' : 'inherit' }}>{formatTime(time)}</div>
                                                    <div style={{ textAlign: 'right', color: isNext ? 'var(--emerald-900)' : 'var(--muted-foreground)' }}>
                                                        {iqama || (prayer === 'Sunrise' ? '☀️' : '--:--')}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <p style={{ textAlign: 'center', padding: '2rem', color: 'var(--muted-foreground)' }}>
                                        No timetable available for today.
                                    </p>
                                )}

                                {todayTimes && todayTimes.jummahs && todayTimes.jummahs.length > 0 && (
                                    <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border)' }}>
                                        <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', color: 'var(--emerald-800)' }}>Jummah Prayers</h3>
                                        <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
                                            {todayTimes.jummahs.map((jummah, index) => (
                                                <div key={index} style={{ background: 'var(--sand)', padding: '1rem', borderRadius: 'var(--radius)', textAlign: 'center' }}>
                                                    <div style={{ fontWeight: '700', fontSize: '1.1rem', color: 'var(--emerald-900)' }}>{jummah.time}</div>
                                                    <div style={{ fontSize: '0.875rem', color: 'var(--muted-foreground)' }}>{jummah.language}</div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Announcements */}
                            {/* Digital Notice Board */}
                            <div className="glass-card">
                                <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem' }}>Digital Notice Board</h2>
                                {announcements.length === 0 ? (
                                    <p style={{ color: 'var(--muted-foreground)', textAlign: 'center', padding: '2rem', background: 'var(--sand)', borderRadius: 'var(--radius)' }}>
                                        No active notices.
                                    </p>
                                ) : (
                                    <div style={{ display: 'grid', gap: '1rem' }}>
                                        {announcements.map(announcement => {
                                            const isAlert = announcement.type === 'alert';
                                            const isPinned = announcement.isPinned;
                                            const borderColor = isAlert ? 'var(--red-500)' :
                                                announcement.type === 'event' ? 'var(--blue-500)' :
                                                    announcement.type === 'jummah' ? 'var(--emerald-500)' :
                                                        'var(--gold-500)';

                                            return (
                                                <div key={announcement.id} style={{
                                                    padding: '1.5rem',
                                                    background: 'var(--white)',
                                                    borderRadius: 'var(--radius)',
                                                    borderLeft: `4px solid ${borderColor}`,
                                                    boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                                                    position: 'relative'
                                                }}>
                                                    {isPinned && (
                                                        <div style={{
                                                            position: 'absolute',
                                                            top: '1rem',
                                                            right: '1rem',
                                                            background: 'var(--gold-100)',
                                                            color: 'var(--gold-800)',
                                                            fontSize: '0.7rem',
                                                            fontWeight: '700',
                                                            padding: '0.2rem 0.5rem',
                                                            borderRadius: '4px',
                                                            textTransform: 'uppercase'
                                                        }}>
                                                            Pinned
                                                        </div>
                                                    )}

                                                    {announcement.type && announcement.type !== 'general' && (
                                                        <span style={{
                                                            fontSize: '0.75rem',
                                                            textTransform: 'uppercase',
                                                            color: 'var(--muted-foreground)',
                                                            fontWeight: '600',
                                                            display: 'block',
                                                            marginBottom: '0.25rem'
                                                        }}>
                                                            {announcement.type}
                                                        </span>
                                                    )}

                                                    <h3 style={{ fontSize: '1.1rem', marginBottom: '0.5rem', color: 'var(--emerald-900)', fontWeight: '700' }}>
                                                        {announcement.title || 'Announcement'}
                                                    </h3>
                                                    <p style={{ color: 'var(--foreground)', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
                                                        {announcement.content || announcement.message}
                                                    </p>
                                                    <div style={{ fontSize: '0.8rem', color: 'var(--muted-foreground)', marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                        <Clock size={14} /> Posted {format(new Date(announcement.createdAt), 'MMM d, yyyy')}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            {/* Location Section - Modern & Interactive */}
                            <div className="glass-card" style={{ marginTop: '2rem', padding: 0, overflow: 'hidden', position: 'relative', height: '400px', border: '1px solid var(--border)' }}>
                                {/* Map Background */}
                                {mosque.location && (
                                    <iframe
                                        width="100%"
                                        height="100%"
                                        frameBorder="0"
                                        style={{ border: 0, filter: 'grayscale(20%) contrast(1.1)' }}
                                        src={`https://maps.google.com/maps?q=${mosque.location.latitude},${mosque.location.longitude}&z=15&output=embed`}
                                        allowFullScreen
                                    ></iframe>
                                )}

                                {/* Floating Overlay */}
                                <div style={{
                                    position: 'absolute',
                                    bottom: 0,
                                    left: 0,
                                    right: 0,
                                    background: 'rgba(255, 255, 255, 0.85)',
                                    backdropFilter: 'blur(12px)',
                                    borderTop: '1px solid rgba(255,255,255,0.5)',
                                    padding: '1.5rem',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '1rem'
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: '1rem', flexWrap: 'wrap' }}>
                                        <div style={{ flex: 1, minWidth: '200px' }}>
                                            <h3 style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--emerald-950)', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                <MapPin size={20} className="text-emerald-600" /> Visit Us
                                            </h3>
                                            <p style={{ color: 'var(--emerald-900)', fontSize: '0.95rem', opacity: 0.8 }}>
                                                {mosque.address}
                                            </p>
                                        </div>

                                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                                            <button
                                                onClick={handleCopyAddress}
                                                className="icon-button"
                                                title="Copy Address"
                                                style={{ background: 'white', boxShadow: '0 2px 5px rgba(0,0,0,0.05)', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', border: '1px solid rgba(0,0,0,0.05)', cursor: 'pointer' }}
                                            >
                                                <Copy size={18} color="var(--emerald-700)" />
                                            </button>
                                            <button
                                                onClick={openMap}
                                                className="btn btn-primary"
                                                style={{ padding: '0.5rem 1.2rem', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem', boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)', borderRadius: '2rem' }}
                                            >
                                                <Navigation size={16} /> Get Directions
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>


            </div>
        </div>
    );
}
