import { useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, addDoc, doc, setDoc, arrayUnion } from 'firebase/firestore';
import { format, eachDayOfInterval, startOfMonth, endOfMonth } from 'date-fns';

const MOCK_MOSQUES = [
    {
        name: "Manchester Central Mosque",
        address: "20 Upper Park Road, Victoria Park, Manchester, M14 5RU",
        description: "Manchester Central Mosque and Islamic Cultural Centre is a place of worship and a community hub.",
        adminIds: ["admin_mcm"],
        jummahs: [
            { time: "12:30 PM", language: "English/Arabic" },
            { time: "1:30 PM", language: "Urdu/Arabic" }
        ],
        baseTimes: { fajr: "06:06", sunrise: "07:50", dhuhr: "12:01", asr: "13:41", maghrib: "16:03", isha: "17:42" }
    },
    {
        name: "Didsbury Mosque",
        address: "271 Burton Road, West Didsbury, Manchester, M20 2XG",
        description: "Didsbury Mosque and Islamic Centre serves the diverse Muslim community of South Manchester.",
        adminIds: ["admin_didsbury"],
        jummahs: [
            { time: "1:00 PM", language: "English" },
            { time: "1:45 PM", language: "Arabic" }
        ],
        baseTimes: { fajr: "06:08", sunrise: "07:52", dhuhr: "12:01", asr: "13:40", maghrib: "16:02", isha: "17:41" }
    },
    {
        name: "Cheadle Mosque",
        address: "377 Wilmslow Road, Heald Green, Cheadle, SK8 3NP",
        description: "Cheadle Masjid (CMA) is a vibrant community hub offering prayers, education, and social services.",
        adminIds: ["admin_cheadle"],
        jummahs: [
            { time: "12:15 PM", language: "English" },
            { time: "1:15 PM", language: "English" }
        ],
        baseTimes: { fajr: "06:20", sunrise: "07:50", dhuhr: "12:00", asr: "14:15", maghrib: "16:03", isha: "17:33" }
    }
];

const PRAYERS = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];

function generateTimetable(monthStr, baseTimes) {
    const start = new Date(monthStr + '-01');
    const end = endOfMonth(start);
    const days = eachDayOfInterval({ start, end });

    return days.map(day => {
        const dateStr = format(day, 'yyyy-MM-dd');
        const times = { date: dateStr };

        // Use base times or defaults
        const t = baseTimes || { fajr: "05:30", sunrise: "07:00", dhuhr: "13:00", asr: "16:30", maghrib: "19:45", isha: "21:00" };

        times.fajr = t.fajr;
        times.fajrIqama = addMinutes(t.fajr, 15);
        times.sunrise = t.sunrise;
        times.dhuhr = t.dhuhr;
        times.dhuhrIqama = addMinutes(t.dhuhr, 15);
        times.asr = t.asr;
        times.asrIqama = addMinutes(t.asr, 15);
        times.maghrib = t.maghrib;
        times.maghribIqama = addMinutes(t.maghrib, 5);
        times.isha = t.isha;
        times.ishaIqama = addMinutes(t.isha, 15);

        return times;
    });
}

function addMinutes(timeStr, minutes) {
    if (!timeStr) return "";
    const [h, m] = timeStr.split(':').map(Number);
    const date = new Date();
    date.setHours(h, m + minutes);
    return format(date, 'HH:mm');
}

import { useAuth } from '@/context/AuthContext';

// ...

export default function SeedData() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState('');

    const handleSeed = async () => {
        setLoading(true);
        setStatus('Starting seed...');

        try {
            const currentMonth = format(new Date(), 'yyyy-MM');

            for (const mosque of MOCK_MOSQUES) {
                // Add current user as admin if logged in
                const mosqueData = { ...mosque };
                if (user) {
                    mosqueData.adminIds = [...mosque.adminIds, user.uid];
                }

                const timetableData = generateTimetable(currentMonth, mosque.baseTimes);
                setStatus(`Creating ${mosque.name}...`);

                // Create Mosque
                const mosqueRef = await addDoc(collection(db, 'mosques'), {
                    ...mosqueData,
                    followers: [],
                    createdAt: new Date().toISOString()
                });

                // Update User Profile if logged in
                if (user) {
                    const userRef = doc(db, 'users', user.uid);
                    await setDoc(userRef, {
                        isAdmin: true,
                        adminMosqueIds: arrayUnion(mosqueRef.id)
                    }, { merge: true });
                }

                // Create Timetable
                const timetableRef = doc(db, `mosques/${mosqueRef.id}/timetables`, currentMonth);
                await setDoc(timetableRef, { days: timetableData });
            }

            setStatus('Success! Database populated with mock data.');
        } catch (error) {
            console.error(error);
            setStatus('Error: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container" style={{ padding: '2rem', textAlign: 'center' }}>
            <h1>Seed Database</h1>
            <p style={{ marginBottom: '2rem' }}>Click below to add sample mosques and timetables to your Firestore database.</p>

            <button onClick={handleSeed} disabled={loading} className="btn btn-primary">
                {loading ? 'Seeding...' : 'Populate Mock Data'}
            </button>

            {status && <p style={{ marginTop: '2rem', fontWeight: 'bold' }}>{status}</p>}
        </div>
    );
}
