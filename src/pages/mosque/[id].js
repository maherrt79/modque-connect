import Head from 'next/head';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { getMosqueById, getTimetable, followMosque, unfollowMosque, getUserProfile, subscribeToAnnouncements } from '@/services/db';
import { useAuth } from '@/context/AuthContext';
import { format, addDays, subDays, isSameMonth, isSameDay } from 'date-fns';
import { Bell, BellOff, Share2, MapPin, ExternalLink, Facebook, Instagram, Twitter, Youtube, Clock, Calendar, Globe, Settings } from 'lucide-react';

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
                            <div className="glass-card">
                                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                                    {isAdmin && (
                                        <button
                                            onClick={() => router.push(`/admin/dashboard?mosqueId=${id}`)}
                                            className="btn btn-primary"
                                            style={{ width: '100%', marginBottom: '0.5rem', background: 'var(--emerald-800)' }}
                                        >
                                            <Settings size={18} style={{ marginRight: '0.5rem' }} /> Manage Mosque
                                        </button>
                                    )}
                                    {isFollowing ? (
                                        <button onClick={handleFollow} className="btn btn-secondary" style={{ flex: 1 }}>
                                            <BellOff size={18} style={{ marginRight: '0.5rem' }} /> Unfollow
                                        </button>
                                    ) : (
                                        <button onClick={handleFollow} className="btn btn-primary" style={{ flex: 1 }}>
                                            <Bell size={18} style={{ marginRight: '0.5rem' }} /> Follow
                                        </button>
                                    )}
                                    <button onClick={handleShare} className="btn btn-logout">
                                        <Share2 size={18} />
                                    </button>
                                </div>

                                <div style={{ marginBottom: '2rem' }}>
                                    <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <MapPin size={18} className="text-emerald-600" /> Location
                                    </h3>
                                    <p style={{ color: 'var(--muted-foreground)', marginBottom: '1rem', lineHeight: '1.6' }}>
                                        {mosque.address}
                                    </p>

                                    {/* Map Embed */}
                                    {mosque.location && (
                                        <div style={{ borderRadius: 'var(--radius)', overflow: 'hidden', height: '200px', marginBottom: '1rem', border: '1px solid var(--border)' }}>
                                            <iframe
                                                width="100%"
                                                height="100%"
                                                frameBorder="0"
                                                style={{ border: 0 }}
                                                src={`https://maps.google.com/maps?q=${mosque.location.latitude},${mosque.location.longitude}&z=15&output=embed`}
                                                allowFullScreen
                                            ></iframe>
                                        </div>
                                    )}

                                    <button onClick={openMap} className="btn btn-logout" style={{ width: '100%', fontSize: '0.9rem' }}>
                                        Get Directions
                                    </button>
                                </div>

                                <div>
                                    <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <Globe size={18} className="text-emerald-600" /> Connect
                                    </h3>

                                    {mosque.website && (
                                        <a href={mosque.website} target="_blank" rel="noopener noreferrer" className="btn btn-primary" style={{ width: '100%', marginBottom: '1rem' }}>
                                            Visit Website <ExternalLink size={16} style={{ marginLeft: '0.5rem' }} />
                                        </a>
                                    )}

                                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                                        {mosque.facebook && (
                                            <a href={mosque.facebook} target="_blank" rel="noopener noreferrer" className="icon-button">
                                                <Facebook size={20} />
                                            </a>
                                        )}
                                        {mosque.instagram && (
                                            <a href={mosque.instagram} target="_blank" rel="noopener noreferrer" className="icon-button">
                                                <Instagram size={20} />
                                            </a>
                                        )}
                                        {mosque.twitter && (
                                            <a href={mosque.twitter} target="_blank" rel="noopener noreferrer" className="icon-button">
                                                <Twitter size={20} />
                                            </a>
                                        )}
                                        {mosque.youtube && (
                                            <a href={mosque.youtube} target="_blank" rel="noopener noreferrer" className="icon-button">
                                                <Youtube size={20} />
                                            </a>
                                        )}
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
                        </div>
                    </div>
                </div>


            </div>
        </div>
    );
}
