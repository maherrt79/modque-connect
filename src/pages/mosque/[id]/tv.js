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
                <div style={{ textAlign: 'center', animation: 'fadeIn 0.5s', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2vmin', width: '100%' }}>
                    {isAfterAdhan ? (
                        <>
                            {/* Top: Prayer Name at Time */}
                            <div className="text-fluid-h1" style={{ color: '#888', marginBottom: '1vmin' }}>
                                {nextPrayer.name} at <span style={{ color: '#fff' }}>{format(nextPrayer.time, 'h:mm a')}</span>
                            </div>

                            {/* Middle: Iqamah Countdown */}
                            <div>
                                <h2 className="text-fluid-h2" style={{ marginBottom: '1vmin', color: 'var(--emerald-400)' }}>
                                    Iqamah in
                                </h2>
                                <div className="text-fluid-huge" style={{ fontWeight: 'bold', fontFamily: 'monospace', color: '#fff', lineHeight: 1 }}>
                                    {getTimeRemaining(targetTime)}
                                </div>
                            </div>
                        </>
                    ) : (
                        <>
                            {/* Top: Prayer Name in */}
                            <div>
                                <h2 className="text-fluid-h2" style={{ marginBottom: '1vmin', color: 'var(--emerald-400)' }}>
                                    {nextPrayer.name} in
                                </h2>
                                <div className="text-fluid-huge" style={{ fontWeight: 'bold', fontFamily: 'monospace', color: '#fff', lineHeight: 1 }}>
                                    {getTimeRemaining(targetTime)}
                                </div>
                            </div>

                            {/* Bottom: Iqamah Time */}
                            <div className="text-fluid-h1" style={{ color: '#888', marginTop: '2vmin' }}>
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
                    padding: '4vmin',
                    border: `1vmin solid ${borderColor}`,
                    borderRadius: '2rem',
                    background: '#111',
                    maxWidth: '90%',
                    width: '90%',
                    animation: 'fadeIn 0.5s',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    textAlign: 'center'
                }}>
                    {announcement.type && (
                        <div className="text-fluid-h2" style={{
                            textTransform: 'uppercase',
                            color: isAlert ? 'var(--red-400)' : 'var(--gold-400)',
                            marginBottom: '2vmin',
                            fontWeight: 'bold'
                        }}>
                            {announcement.type}
                        </div>
                    )}
                    <h2 className="text-fluid-h1" style={{ marginBottom: '3vmin', color: '#fff', lineHeight: 1.2 }}>
                        {announcement.title || 'Announcement'}
                    </h2>
                    <p className="text-fluid-h2" style={{ color: '#ccc', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
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
                    :root {
                        --sidebar-width: 30vw;
                        --sidebar-height: 100vh;
                        --content-width: 70vw;
                        --content-height: 100vh;
                        --bg-sidebar: #111;
                        --bg-content: radial-gradient(circle at center, #222 0%, #000 100%);
                    }

                    @keyframes fadeIn {
                        from { opacity: 0; transform: scale(0.98); }
                        to { opacity: 1; transform: scale(1); }
                    }
                    
                    body { margin: 0; cursor: none; overflow: hidden; background: #000; }

                    .tv-container {
                        display: flex;
                        flex-direction: row;
                        width: 100vw;
                        height: 100vh;
                        color: #fff;
                        font-family: system-ui, -apple-system, sans-serif;
                        overflow: hidden;
                    }

                    .tv-sidebar {
                        width: var(--sidebar-width);
                        height: var(--sidebar-height);
                        background: var(--bg-sidebar);
                        border-right: 1px solid #333;
                        display: flex;
                        flex-direction: column;
                        padding: 2vmin;
                        overflow-y: auto;
                        scrollbar-width: none;
                        -ms-overflow-style: none;
                        transition: all 0.3s ease;
                    }
                    
                    .tv-sidebar::-webkit-scrollbar { display: none; }

                    .tv-content {
                        width: var(--content-width);
                        height: var(--content-height);
                        flex: 1;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        position: relative;
                        background: var(--bg-content);
                    }

                    /* Responsive Text Utilities */
                    .text-fluid-h1 { font-size: clamp(1.5rem, 4vmin, 3rem); }
                    .text-fluid-h2 { font-size: clamp(1.2rem, 3vmin, 2.5rem); }
                    .text-fluid-body { font-size: clamp(0.8rem, 2vmin, 1.5rem); }
                    .text-fluid-huge { font-size: clamp(4rem, 15vmin, 20rem); }
                    .text-fluid-clock { font-size: clamp(2rem, 6vmin, 5rem); }

                    /* Portrait Layout */
                    @media (orientation: portrait) {
                        :root {
                            --sidebar-width: 100vw;
                            --sidebar-height: 45vh; /* Slightly less than half for prayer list */
                            --content-width: 100vw;
                            --content-height: 55vh;
                        }
                        
                        .tv-container { flex-direction: column; }
                        
                        .tv-sidebar {
                            border-right: none;
                            border-bottom: 1px solid #333;
                            order: 2; /* Sidebar at bottom in portrait? Or top? User asked for "best experience". Usually top is better for list, bottom for main content? Let's stick to top for now as per previous, or maybe bottom is better for "TV" feel? Let's keep sidebar on TOP as per previous iteration. */
                            order: 1; 
                        }
                        
                        .tv-content {
                            order: 2;
                        }
                    }
                `}</style>
            </Head>

            {/* Sidebar - Prayer Times */}
            <div className="tv-sidebar">
                <div style={{ marginBottom: '2vmin' }}>
                    <h1 className="text-fluid-h1" style={{ fontWeight: 'bold', color: 'var(--emerald-500)', marginBottom: '0.5vmin', lineHeight: 1.2 }}>{mosque.name}</h1>
                    <div className="text-fluid-body" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#888' }}>
                        <MapPin size={18} style={{ minWidth: '18px' }} /> <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{mosque.address}</span>
                    </div>
                </div>

                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5vmin' }}>
                    {/* Header Row */}
                    <div className="text-fluid-body" style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr', columnGap: '1rem', padding: '0 1.5vmin', marginBottom: '0.5vmin', color: '#666', textTransform: 'uppercase', letterSpacing: '1px', fontSize: '0.8rem' }}>
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
                                padding: '1vmin 1.5vmin',
                                background: isNext ? 'var(--emerald-900)' : '#222',
                                borderRadius: '1rem',
                                border: isNext ? '2px solid var(--emerald-500)' : '1px solid transparent',
                                opacity: isNext ? 1 : 0.7
                            }}>
                                <span className="text-fluid-h2" style={{ fontWeight: isNext ? 'bold' : 'normal', color: isNext ? '#fff' : '#eee' }}>{prayer}</span>

                                <div style={{ textAlign: 'center' }}>
                                    <span className="text-fluid-h2" style={{ fontWeight: isNext ? 'bold' : 'normal', color: isNext ? '#fff' : 'var(--gold-400)' }}>
                                        {time}
                                    </span>
                                </div>

                                <div style={{ textAlign: 'right' }}>
                                    {iqama ? (
                                        <span className="text-fluid-h2" style={{ fontWeight: isNext ? 'bold' : 'normal', color: isNext ? '#fff' : '#ccc' }}>
                                            {iqama}
                                        </span>
                                    ) : (
                                        <span className="text-fluid-h2" style={{ color: '#444' }}>--:--</span>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div style={{ marginTop: 'auto', textAlign: 'center', padding: '1vmin', background: '#222', borderRadius: '1rem' }}>
                    <div className="text-fluid-clock" style={{ fontWeight: 'bold', lineHeight: 1 }}>
                        {format(currentTime, 'h:mm')} <span style={{ fontSize: '0.5em', color: '#888' }}>{format(currentTime, 'a')}</span>
                    </div>
                    <div className="text-fluid-body" style={{ color: '#888', marginTop: '0.25rem' }}>
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
