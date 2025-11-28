import Head from 'next/head';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { getMosqueById, getTimetable, subscribeToAnnouncements } from '@/services/db';
import { format } from 'date-fns';
import { MapPin } from 'lucide-react';

export default function TVView() {
    const router = useRouter();
    const { id } = router.query;

    const [mosque, setMosque] = useState(null);
    const [timetable, setTimetable] = useState([]);
    const [announcements, setAnnouncements] = useState([]);
    const [currentTime, setCurrentTime] = useState(new Date());
    const [currentSlide, setCurrentSlide] = useState(0);

    // Data Fetching
    useEffect(() => {
        if (!id) return;

        // Initial Load
        getMosqueById(id).then(setMosque);
        const currentMonth = format(new Date(), 'yyyy-MM');
        getTimetable(id, currentMonth).then(setTimetable);

        // Real-time Announcements
        const unsubscribe = subscribeToAnnouncements(id, (data) => {
            setAnnouncements(data);
        });

        // Auto-refresh data every 10 minutes
        const refreshInterval = setInterval(() => {
            getMosqueById(id).then(setMosque);
            getTimetable(id, format(new Date(), 'yyyy-MM')).then(setTimetable);
        }, 10 * 60 * 1000);

        return () => {
            unsubscribe();
            clearInterval(refreshInterval);
        };
    }, [id]);

    // Clock Timer
    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(new Date());
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    // Slide Rotation Logic
    useEffect(() => {
        const totalSlides = 1 + announcements.length;
        if (totalSlides <= 1) return; // No rotation if only countdown

        // Duration: 60 seconds for Countdown (slide 0), 10 seconds for Announcements
        const duration = currentSlide === 0 ? 60000 : 10000;

        const timer = setTimeout(() => {
            setCurrentSlide(current => (current + 1) % totalSlides);
        }, duration);

        return () => clearTimeout(timer);
    }, [currentSlide, announcements.length]);

    // Derived State
    const todayTimes = timetable.find(d => d.date === format(currentTime, 'yyyy-MM-dd'));

    const getNextPrayer = (times) => {
        if (!times) return null;
        const now = new Date();
        const prayerNames = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];

        for (const prayer of prayerNames) {
            const key = prayer.toLowerCase();
            const timeStr = times[key];
            if (!timeStr) continue;

            const [time, modifier] = timeStr.split(' ');
            let [hours, minutes] = time.split(':');

            if (modifier === 'PM' && hours !== '12') hours = parseInt(hours) + 12;
            if (modifier === 'AM' && hours === '12') hours = 0;

            const prayerDate = new Date();
            prayerDate.setHours(hours, minutes, 0);

            // Parse Iqamah Time
            let iqamahDate = null;
            const iqamahStr = times[key + 'Iqama'];
            if (iqamahStr) {
                // Iqamah usually doesn't have AM/PM in the input, assuming 24h or same cycle as prayer
                // But based on previous code, it seems to be just HH:mm. Let's assume 24h for now or infer from prayer time
                // Actually, the input in admin panel was type="time" which saves as HH:mm (24h)
                const [iHours, iMinutes] = iqamahStr.split(':');
                iqamahDate = new Date();
                iqamahDate.setHours(iHours, iMinutes, 0);
            }

            // If prayer is in future, OR if it's "now" (between Adhan and Iqamah)
            // We consider it "next" if we haven't passed the Iqamah yet (or some buffer)
            // For simplicity, let's stick to the original logic: find the first prayer > now
            // BUT, if we are in the window between Adhan and Iqamah, we still want to show THIS prayer as the "Active" one.

            if (iqamahDate && iqamahDate > now) {
                return { name: prayer, time: prayerDate, iqamahTime: iqamahDate };
            } else if (!iqamahDate && prayerDate > now) {
                return { name: prayer, time: prayerDate, iqamahTime: null };
            }
        }
        return { name: 'Fajr', time: null, isTomorrow: true };
    };

    const nextPrayer = getNextPrayer(todayTimes);

    // Helper for time remaining
    const getTimeRemaining = (targetTime) => {
        if (!targetTime) return '';
        const diff = targetTime - currentTime;
        if (diff <= 0) return 'Now';

        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    };

    if (!mosque) return <div style={{ background: '#000', height: '100vh', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading...</div>;

    // Slide Content
    const renderSlide = () => {
        if (currentSlide === 0) {
            // Countdown Slide
            const isAfterAdhan = nextPrayer.time && currentTime >= nextPrayer.time;
            const targetTime = isAfterAdhan ? nextPrayer.iqamahTime : nextPrayer.time;

            return (
                <div style={{ textAlign: 'center', animation: 'fadeIn 0.5s', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                    {isAfterAdhan ? (
                        <>
                            {/* Top: Prayer Name at Time */}
                            <div style={{ fontSize: '3rem', color: '#888', marginBottom: '1rem' }}>
                                {nextPrayer.name} at <span style={{ color: '#fff' }}>{format(nextPrayer.time, 'h:mm a')}</span>
                            </div>

                            {/* Middle: Iqamah Countdown */}
                            <div>
                                <h2 style={{ fontSize: '4rem', marginBottom: '1rem', color: 'var(--emerald-400)' }}>
                                    Iqamah in
                                </h2>
                                <div style={{ fontSize: '8rem', fontWeight: 'bold', fontFamily: 'monospace', color: '#fff' }}>
                                    {getTimeRemaining(targetTime)}
                                </div>
                            </div>
                        </>
                    ) : (
                        <>
                            {/* Top: Prayer Name in */}
                            <div>
                                <h2 style={{ fontSize: '4rem', marginBottom: '1rem', color: 'var(--emerald-400)' }}>
                                    {nextPrayer.name} in
                                </h2>
                                <div style={{ fontSize: '8rem', fontWeight: 'bold', fontFamily: 'monospace', color: '#fff' }}>
                                    {getTimeRemaining(targetTime)}
                                </div>
                            </div>

                            {/* Bottom: Iqamah Time */}
                            <div style={{ fontSize: '3rem', color: '#888', marginTop: '1rem' }}>
                                Iqamah: <span style={{ color: '#fff' }}>
                                    {nextPrayer.iqamahTime ? format(nextPrayer.iqamahTime, 'h:mm a') : '--:--'}
                                </span>
                            </div>
                        </>
                    )}
                </div>
            );
        } else {
            // Announcement Slide
            const announcementIndex = currentSlide - 1;
            const announcement = announcements[announcementIndex];

            if (!announcement) return null; // Should not happen

            const isAlert = announcement.type === 'alert';
            const borderColor = isAlert ? 'var(--red-500)' : 'var(--gold-500)';

            return (
                <div style={{
                    padding: '4rem',
                    border: `8px solid ${borderColor}`,
                    borderRadius: '2rem',
                    background: '#111',
                    maxWidth: '90%',
                    animation: 'fadeIn 0.5s'
                }}>
                    {announcement.type && (
                        <div style={{
                            fontSize: '2rem',
                            textTransform: 'uppercase',
                            color: isAlert ? 'var(--red-400)' : 'var(--gold-400)',
                            marginBottom: '1rem',
                            fontWeight: 'bold'
                        }}>
                            {announcement.type}
                        </div>
                    )}
                    <h2 style={{ fontSize: '5rem', marginBottom: '2rem', color: '#fff', lineHeight: 1.2 }}>
                        {announcement.title || 'Announcement'}
                    </h2>
                    <p style={{ fontSize: '3rem', color: '#ccc', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                        {announcement.content || announcement.message}
                    </p>
                </div>
            );
        }
    };

    return (
        <div className="tv-container">
            <Head>
                <title>{mosque.name} - TV View</title>
                <meta name="viewport" content="width=device-width, initial-scale=1" />
                <style>{`
                    @keyframes fadeIn {
                        from { opacity: 0; transform: scale(0.98); }
                        to { opacity: 1; transform: scale(1); }
                    }
                    body { margin: 0; cursor: none; }

                    /* Default Landscape Layout */
                    .tv-container {
                        display: flex;
                        flex-direction: row;
                        background: #000;
                        min-height: 100vh;
                        color: #fff;
                        font-family: system-ui, sans-serif;
                        overflow: hidden;
                    }
                    .tv-sidebar {
                        width: 35%;
                        background: #111;
                        border-right: 1px solid #333;
                        padding: 2rem;
                        display: flex;
                        flex-direction: column;
                        height: 100vh;
                        overflow-y: auto;
                    }
                    .tv-content {
                        flex: 1;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        position: relative;
                        background: radial-gradient(circle at center, #222 0%, #000 100%);
                        height: 100vh;
                    }

                    /* Portrait Layout - Trigger on actual portrait screens OR screens narrower than 1280px */
                    @media (orientation: portrait), (max-width: 1280px) {
                        .tv-container {
                            flex-direction: column; /* Sidebar on top, Content on bottom */
                        }
                        .tv-sidebar {
                            width: 100%;
                            height: 50vh; /* Half screen for prayer list */
                            border-right: none;
                            border-top: 1px solid #333;
                            padding: 1rem;
                        }
                        .tv-content {
                            width: 100%;
                            height: 50vh; /* Half screen for countdown */
                        }
                        /* Adjust font sizes for portrait */
                        .tv-sidebar h1 { font-size: 1.5rem !important; margin-bottom: 0.25rem !important; }
                        .tv-sidebar .map-pin { font-size: 1rem !important; }
                        .tv-sidebar .prayer-row { padding: 0.75rem 1rem !important; }
                        .tv-sidebar .prayer-name, .tv-sidebar .prayer-time { font-size: 1.2rem !important; }
                    }
                `}</style>
            </Head>

            {/* Sidebar - Prayer Times */}
            <div className="tv-sidebar">
                <div style={{ marginBottom: '2rem' }}>
                    <h1 style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--emerald-500)', marginBottom: '0.5rem' }}>{mosque.name}</h1>
                    <div className="map-pin" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#888', fontSize: '1.2rem' }}>
                        <MapPin size={24} /> {mosque.address}
                    </div>
                </div>

                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {/* Header Row */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr', columnGap: '1rem', padding: '0 1.5rem', marginBottom: '0.5rem', color: '#666', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '1px' }}>
                        <div>Prayer</div>
                        <div style={{ textAlign: 'center' }}>Adhan</div>
                        <div style={{ textAlign: 'right' }}>Iqamah</div>
                    </div>

                    {['Fajr', 'Sunrise', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'].map((prayer) => {
                        const key = prayer.toLowerCase();
                        const time = todayTimes ? todayTimes[key] : '--:--';
                        const iqama = (todayTimes && prayer !== 'Sunrise') ? todayTimes[key + 'Iqama'] : null;
                        const isNext = nextPrayer?.name === prayer;

                        return (
                            <div key={prayer} className="prayer-row" style={{
                                display: 'grid',
                                gridTemplateColumns: '1.4fr 1fr 1fr',
                                columnGap: '1rem',
                                alignItems: 'center',
                                padding: '1.25rem 1.5rem',
                                background: isNext ? 'var(--emerald-900)' : '#222',
                                borderRadius: '1rem',
                                border: isNext ? '2px solid var(--emerald-500)' : '1px solid transparent',
                                opacity: isNext ? 1 : 0.7
                            }}>
                                <span className="prayer-name" style={{ fontSize: '1.5rem', fontWeight: isNext ? 'bold' : 'normal', color: isNext ? '#fff' : '#eee' }}>{prayer}</span>

                                <div style={{ textAlign: 'center' }}>
                                    <span className="prayer-time" style={{ fontSize: '1.5rem', fontWeight: isNext ? 'bold' : 'normal', color: isNext ? '#fff' : 'var(--gold-400)' }}>
                                        {time}
                                    </span>
                                </div>

                                <div style={{ textAlign: 'right' }}>
                                    {iqama ? (
                                        <span className="prayer-time" style={{ fontSize: '1.5rem', fontWeight: isNext ? 'bold' : 'normal', color: isNext ? '#fff' : '#ccc' }}>
                                            {iqama}
                                        </span>
                                    ) : (
                                        <span className="prayer-time" style={{ fontSize: '1.5rem', color: '#444' }}>--:--</span>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div style={{ marginTop: 'auto', textAlign: 'center', padding: '1rem', background: '#222', borderRadius: '1rem' }}>
                    <div style={{ fontSize: '2.5rem', fontWeight: 'bold' }}>
                        {format(currentTime, 'h:mm')} <span style={{ fontSize: '1.5rem', color: '#888' }}>{format(currentTime, 'a')}</span>
                    </div>
                    <div style={{ fontSize: '1rem', color: '#888', marginTop: '0.25rem' }}>
                        {format(currentTime, 'EEEE, MMMM d, yyyy')}
                    </div>
                </div>
            </div>

            {/* Main Content - Carousel */}
            <div className="tv-content">
                {renderSlide()}

                {/* Progress Bar / Indicators could go here */}
                <div style={{ position: 'absolute', bottom: '2rem', display: 'flex', gap: '1rem' }}>
                    {Array.from({ length: 1 + announcements.length }).map((_, idx) => (
                        <div key={idx} style={{
                            width: '1rem',
                            height: '1rem',
                            borderRadius: '50%',
                            background: idx === currentSlide ? 'var(--emerald-500)' : '#333',
                            transition: 'background 0.3s'
                        }} />
                    ))}
                </div>
            </div>
        </div>
    );
}
