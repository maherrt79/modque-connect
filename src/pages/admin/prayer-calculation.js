import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/context/AuthContext';
import { getUserProfile, getTimetable, updateTimetable, getMosqueById } from '@/services/db';
import { format, getDaysInMonth } from 'date-fns';
import { Coordinates, CalculationMethod, PrayerTimes, Madhab } from 'adhan';

export default function PrayerCalculation() {
    const { user } = useAuth();
    const router = useRouter();

    const [loading, setLoading] = useState(true);
    const [calculating, setCalculating] = useState(false);
    const [exporting, setExporting] = useState(false);
    const [mosqueId, setMosqueId] = useState(null);
    const [coordinates, setCoordinates] = useState({ lat: '', lng: '' });
    const [method, setMethod] = useState('NorthAmerica');
    const [madhab, setMadhab] = useState('Shafi');
    const [month, setMonth] = useState(format(new Date(), 'yyyy-MM'));
    const [calculatedTimes, setCalculatedTimes] = useState([]);

    // Fetch User & Validate Access
    useEffect(() => {
        if (!user || !router.isReady) return;

        const { mosqueId: queryMosqueId } = router.query;

        if (!queryMosqueId) {
            router.push('/admin/dashboard');
            return;
        }

        getUserProfile(user.uid).then(async (profile) => {
            if (profile?.adminMosqueIds?.includes(queryMosqueId)) {
                setMosqueId(queryMosqueId);
                // Try to get mosque location if available
                const mosqueData = await getMosqueById(queryMosqueId);
                if (mosqueData && mosqueData.location) {
                    setCoordinates({
                        lat: mosqueData.location.latitude || '',
                        lng: mosqueData.location.longitude || ''
                    });
                }
                setLoading(false);
            } else {
                alert("You do not have permission to edit this mosque.");
                router.push('/admin/dashboard');
            }
        });
    }, [user, router.isReady, router.query]);

    const handleCalculate = () => {
        if (!coordinates.lat || !coordinates.lng) {
            alert('Please enter valid coordinates');
            return;
        }

        setCalculating(true);
        try {
            const coords = new Coordinates(parseFloat(coordinates.lat), parseFloat(coordinates.lng));
            const date = new Date(month + '-01');
            const year = date.getFullYear();
            const monthIndex = date.getMonth();
            const daysInMonth = getDaysInMonth(date);
            const times = [];

            // Use the selected method directly as it matches the library keys
            let params = CalculationMethod[method]();
            if (madhab === 'Hanafi') {
                params.madhab = Madhab.Hanafi;
            } else {
                params.madhab = Madhab.Shafi;
            }

            for (let i = 1; i <= daysInMonth; i++) {
                const dayDate = new Date(year, monthIndex, i);
                const prayerTimes = new PrayerTimes(coords, dayDate, params);

                times.push({
                    date: format(dayDate, 'yyyy-MM-dd'),
                    fajr: format(prayerTimes.fajr, 'HH:mm'),
                    sunrise: format(prayerTimes.sunrise, 'HH:mm'),
                    dhuhr: format(prayerTimes.dhuhr, 'HH:mm'),
                    asr: format(prayerTimes.asr, 'HH:mm'),
                    sunset: format(prayerTimes.sunset, 'HH:mm'),
                    maghrib: format(prayerTimes.maghrib, 'HH:mm'),
                    isha: format(prayerTimes.isha, 'HH:mm'),
                });
            }
            setCalculatedTimes(times);
        } catch (error) {
            console.error(error);
            alert('Error calculating times. Please check your inputs.');
        } finally {
            setCalculating(false);
        }
    };

    const handleExport = async () => {
        if (calculatedTimes.length === 0) return;
        setExporting(true);
        try {
            // 1. Fetch existing timetable to preserve Iqama times
            const existingData = await getTimetable(mosqueId, month);
            const existingMap = {};
            if (existingData) {
                existingData.forEach(day => {
                    existingMap[day.date] = day;
                });
            }

            // 2. Merge calculated times with existing Iqama times
            const mergedData = calculatedTimes.map(day => {
                const existingDay = existingMap[day.date] || {};
                return {
                    ...day,
                    fajrIqama: existingDay.fajrIqama || '',
                    dhuhrIqama: existingDay.dhuhrIqama || '',
                    asrIqama: existingDay.asrIqama || '',
                    maghribIqama: existingDay.maghribIqama || '',
                    ishaIqama: existingDay.ishaIqama || '',
                };
            });

            // 3. Save to DB
            await updateTimetable(mosqueId, month, mergedData);

            // 4. Redirect to editor
            router.push(`/admin/timetable?mosqueId=${mosqueId}`);
        } catch (error) {
            console.error(error);
            alert('Error exporting timetable.');
        } finally {
            setExporting(false);
        }
    };

    if (loading) return <div className="container" style={{ padding: '2rem' }}>Loading...</div>;

    return (
        <div className="container" style={{ padding: '2rem 1rem' }}>
            <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '2rem' }}>Prayer Time Calculator</h1>

            <div className="card" style={{ marginBottom: '2rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem' }}>Latitude</label>
                        <input
                            type="number"
                            className="input"
                            value={coordinates.lat}
                            onChange={e => setCoordinates({ ...coordinates, lat: e.target.value })}
                            placeholder="e.g. 51.5074"
                        />
                    </div>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem' }}>Longitude</label>
                        <input
                            type="number"
                            className="input"
                            value={coordinates.lng}
                            onChange={e => setCoordinates({ ...coordinates, lng: e.target.value })}
                            placeholder="e.g. -0.1278"
                        />
                    </div>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem' }}>Method</label>
                        <select className="input" value={method} onChange={e => setMethod(e.target.value)}>
                            {Object.keys(CalculationMethod).map(m => (
                                <option key={m} value={m}>{m}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem' }}>Madhab</label>
                        <select className="input" value={madhab} onChange={e => setMadhab(e.target.value)}>
                            <option value="Shafi">Shafi (Standard)</option>
                            <option value="Hanafi">Hanafi</option>
                        </select>
                    </div>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem' }}>Month</label>
                        <input
                            type="month"
                            className="input"
                            value={month}
                            onChange={e => setMonth(e.target.value)}
                        />
                    </div>
                </div>
                <div style={{ marginTop: '1rem', display: 'flex', gap: '1rem' }}>
                    <button onClick={handleCalculate} disabled={calculating} className="btn btn-primary">
                        {calculating ? 'Calculating...' : 'Calculate Times'}
                    </button>
                    <button onClick={() => router.push(`/admin/timetable?mosqueId=${mosqueId}`)} className="btn btn-secondary">
                        Cancel
                    </button>
                </div>
            </div>

            {calculatedTimes.length > 0 && (
                <div className="card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                        <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>Preview</h2>
                        <button onClick={handleExport} disabled={exporting} className="btn btn-primary">
                            {exporting ? 'Exporting...' : 'Export to Timetable Editor'}
                        </button>
                    </div>
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ borderBottom: '2px solid var(--border)' }}>
                                    <th style={{ padding: '0.5rem', textAlign: 'left' }}>Date</th>
                                    <th style={{ padding: '0.5rem' }}>Fajr</th>
                                    <th style={{ padding: '0.5rem' }}>Sunrise</th>
                                    <th style={{ padding: '0.5rem' }}>Dhuhr</th>
                                    <th style={{ padding: '0.5rem' }}>Asr</th>
                                    <th style={{ padding: '0.5rem' }}>Maghrib</th>
                                    <th style={{ padding: '0.5rem' }}>Isha</th>
                                </tr>
                            </thead>
                            <tbody>
                                {calculatedTimes.map((day) => (
                                    <tr key={day.date} style={{ borderBottom: '1px solid var(--border)' }}>
                                        <td style={{ padding: '0.5rem' }}>{day.date}</td>
                                        <td style={{ padding: '0.5rem', textAlign: 'center' }}>{day.fajr}</td>
                                        <td style={{ padding: '0.5rem', textAlign: 'center' }}>{day.sunrise}</td>
                                        <td style={{ padding: '0.5rem', textAlign: 'center' }}>{day.dhuhr}</td>
                                        <td style={{ padding: '0.5rem', textAlign: 'center' }}>{day.asr}</td>
                                        <td style={{ padding: '0.5rem', textAlign: 'center' }}>{day.maghrib}</td>
                                        <td style={{ padding: '0.5rem', textAlign: 'center' }}>{day.isha}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
