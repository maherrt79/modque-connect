import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/context/AuthContext';
import { getUserProfile, getTimetable, updateTimetable, getMosqueById, updateMosqueProfile } from '@/services/db';
import { format, getDaysInMonth, startOfMonth, addMonths, subMonths } from 'date-fns';

const PRAYERS = ['Fajr', 'Sunrise', 'Dhuhr', 'Asr', 'Sunset', 'Maghrib', 'Isha'];

export default function TimetableEditor() {
    const { user } = useAuth();
    const router = useRouter();

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [mosqueId, setMosqueId] = useState(null);
    const [currentDate, setCurrentDate] = useState(new Date());
    const [timetable, setTimetable] = useState({});
    const [jummahs, setJummahs] = useState([]);

    // Fetch User & Validate Access
    useEffect(() => {
        if (!user || !router.isReady) return;

        const { mosqueId: queryMosqueId } = router.query;

        if (!queryMosqueId) {
            // If no ID provided, redirect to dashboard
            router.push('/admin/dashboard');
            return;
        }

        getUserProfile(user.uid).then(async (profile) => {
            // Check if user is admin of this specific mosque
            if (profile?.adminMosqueIds?.includes(queryMosqueId)) {
                setMosqueId(queryMosqueId);
                // Load Mosque Data for Jummah
                const mosqueData = await getMosqueById(queryMosqueId);
                if (mosqueData) {
                    setJummahs(mosqueData.jummahs || []);
                }
            } else {
                alert("You do not have permission to edit this mosque.");
                router.push('/admin/dashboard');
            }
        });
    }, [user, router.isReady, router.query]);

    // Fetch Timetable when mosqueId or month changes
    useEffect(() => {
        if (!mosqueId) return;

        const monthStr = format(currentDate, 'yyyy-MM');
        setLoading(true);

        getTimetable(mosqueId, monthStr).then(data => {
            // Convert array to object keyed by date for easier editing
            const tableMap = {};
            if (data) {
                data.forEach(day => {
                    tableMap[day.date] = day;
                });
            }
            setTimetable(tableMap);
            setLoading(false);
        });
    }, [mosqueId, currentDate]);

    const handleInputChange = (dateStr, field, value) => {
        setTimetable(prev => ({
            ...prev,
            [dateStr]: {
                ...prev[dateStr],
                date: dateStr,
                [field]: value
            }
        }));
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const monthStr = format(currentDate, 'yyyy-MM');
            // Convert map back to array
            const daysArray = Object.values(timetable);
            await updateTimetable(mosqueId, monthStr, daysArray);

            // Update Jummah settings
            await updateMosqueProfile(mosqueId, { jummahs });

            alert('Timetable and Jummah settings saved successfully!');
        } catch (error) {
            console.error(error);
            alert('Error saving changes');
        } finally {
            setSaving(false);
        }
    };

    const daysInMonth = getDaysInMonth(currentDate);

    if (!user) return <div className="container" style={{ padding: '2rem' }}>Please login.</div>;
    if (!mosqueId && !loading) return <div className="container" style={{ padding: '2rem' }}>Loading profile...</div>;

    return (
        <div className="container" style={{ padding: '2rem 1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h1 style={{ fontSize: '2rem', fontWeight: 'bold' }}>Timetable Editor</h1>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <button
                        onClick={() => router.push(`/admin/prayer-calculation?mosqueId=${mosqueId}`)}
                        className="btn btn-secondary"
                    >
                        Calculate Prayer Times
                    </button>
                    <button onClick={handleSave} disabled={saving} className="btn btn-primary">
                        {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>
            </div>

            {/* Jummah Settings */}
            <div className="card" style={{ marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>Jummah Prayers</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {jummahs.map((jummah, index) => (
                        <div key={index} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end' }}>
                            <div style={{ flex: 1 }}>
                                <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: '0.25rem' }}>Time</label>
                                <input
                                    type="time"
                                    className="input"
                                    style={{ marginBottom: 0 }}
                                    value={jummah.time}
                                    onChange={e => {
                                        const newJummahs = [...jummahs];
                                        newJummahs[index].time = e.target.value;
                                        setJummahs(newJummahs);
                                    }}
                                />
                            </div>
                            <div style={{ flex: 2 }}>
                                <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: '0.25rem' }}>Note</label>
                                <input
                                    type="text"
                                    className="input"
                                    style={{ marginBottom: 0 }}
                                    placeholder="English, Arabic, etc."
                                    value={jummah.language}
                                    onChange={e => {
                                        const newJummahs = [...jummahs];
                                        newJummahs[index].language = e.target.value;
                                        setJummahs(newJummahs);
                                    }}
                                />
                            </div>
                            <button
                                onClick={() => {
                                    const newJummahs = jummahs.filter((_, i) => i !== index);
                                    setJummahs(newJummahs);
                                }}
                                className="btn"
                                style={{ color: 'red', border: '1px solid red', padding: '0.5rem' }}
                            >
                                X
                            </button>
                        </div>
                    ))}
                    <button
                        onClick={() => setJummahs([...jummahs, { time: '', language: '' }])}
                        className="btn btn-secondary"
                        style={{ width: 'fit-content' }}
                    >
                        + Add Jummah Time
                    </button>
                </div>
            </div>

            <div className="card" style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <button onClick={() => setCurrentDate(subMonths(currentDate, 1))} className="btn btn-secondary">&larr; Prev</button>
                <h2 style={{ fontSize: '1.5rem', fontWeight: '600' }}>{format(currentDate, 'MMMM yyyy')}</h2>
                <button onClick={() => setCurrentDate(addMonths(currentDate, 1))} className="btn btn-secondary">Next &rarr;</button>
            </div>

            <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px' }}>
                    <thead>
                        <tr style={{ borderBottom: '2px solid var(--border)' }}>
                            <th style={{ padding: '1rem', textAlign: 'left' }}>Date</th>
                            {PRAYERS.map(p => (
                                <th key={p} style={{ padding: '1rem', textAlign: 'center' }} colSpan={2}>
                                    {p}
                                    <div style={{ fontSize: '0.75rem', fontWeight: 'normal', color: 'var(--muted-foreground)' }}>
                                        <span>Time</span> / <span>Iqama</span>
                                    </div>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {Array.from({ length: daysInMonth }).map((_, i) => {
                            const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), i + 1);
                            const dateStr = format(date, 'yyyy-MM-dd');
                            const dayData = timetable[dateStr] || {};

                            return (
                                <tr key={dateStr} style={{ borderBottom: '1px solid var(--border)' }}>
                                    <td style={{ padding: '0.75rem', fontWeight: '500' }}>
                                        {format(date, 'd MMM')} <br />
                                        <span style={{ fontSize: '0.8rem', color: 'var(--muted-foreground)' }}>{format(date, 'EEE')}</span>
                                    </td>
                                    {PRAYERS.map(p => (
                                        <td key={p} colSpan={2} style={{ padding: '0.5rem' }}>
                                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                <input
                                                    type="time"
                                                    className="input"
                                                    style={{ marginBottom: 0, padding: '0.25rem', fontSize: '0.9rem' }}
                                                    value={dayData[p.toLowerCase()] || ''}
                                                    onChange={e => handleInputChange(dateStr, p.toLowerCase(), e.target.value)}
                                                />
                                                {p !== 'Sunrise' && (
                                                    <input
                                                        type="time"
                                                        className="input"
                                                        style={{ marginBottom: 0, padding: '0.25rem', fontSize: '0.9rem', color: 'var(--primary)' }}
                                                        value={dayData[p.toLowerCase() + 'Iqama'] || ''}
                                                        onChange={e => handleInputChange(dateStr, p.toLowerCase() + 'Iqama', e.target.value)}
                                                    />
                                                )}
                                                {p === 'Sunrise' && (
                                                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>☀️</div>
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
        </div>
    );
}
