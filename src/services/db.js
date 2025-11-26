import { db } from '@/lib/firebase';
import {
    collection,
    doc,
    setDoc,
    getDoc,
    getDocs,
    updateDoc,
    arrayUnion,
    arrayRemove,
    query,
    where,
    addDoc,
    deleteDoc,
    onSnapshot
} from 'firebase/firestore';

// --- Mosque Services ---

export async function createMosqueProfile(userId, mosqueData) {
    // Create a mosque document linked to the admin (userId)
    const mosqueRef = doc(collection(db, 'mosques'));
    await setDoc(mosqueRef, {
        ...mosqueData,
        adminIds: [userId],
        followers: [],
        createdAt: new Date().toISOString()
    });

    // Also update user profile to say they are an admin of this mosque
    const userRef = doc(db, 'users', userId);
    await setDoc(userRef, {
        isAdmin: true,
        adminMosqueIds: arrayUnion(mosqueRef.id)
    }, { merge: true });

    return mosqueRef.id;
}

export async function deleteMosque(mosqueId) {
    const mosque = await getMosqueById(mosqueId);
    if (!mosque) return;

    // Delete mosque document
    await deleteDoc(doc(db, 'mosques', mosqueId));

    // Remove from all admins
    if (mosque.adminIds && mosque.adminIds.length > 0) {
        for (const adminId of mosque.adminIds) {
            const userRef = doc(db, 'users', adminId);
            await updateDoc(userRef, {
                adminMosqueIds: arrayRemove(mosqueId)
            });
        }
    }
}

export async function addAdminToMosque(mosqueId, email) {
    // Find user by email
    const users = await getUsersByEmail(email);
    if (users.length === 0) {
        throw new Error('User not found');
    }
    const user = users[0];

    // Add mosque to user's admin list
    const userRef = doc(db, 'users', user.id);
    await updateDoc(userRef, {
        isAdmin: true,
        adminMosqueIds: arrayUnion(mosqueId)
    });

    // Add user to mosque's admin list
    const mosqueRef = doc(db, 'mosques', mosqueId);
    await updateDoc(mosqueRef, {
        adminIds: arrayUnion(user.id)
    });
}

export async function getMosquesByIds(ids) {
    if (!ids || ids.length === 0) return [];
    const q = query(collection(db, 'mosques'), where('__name__', 'in', ids));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

export async function getMosques() {
    const querySnapshot = await getDocs(collection(db, 'mosques'));
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

export async function getMosqueById(id) {
    const docRef = doc(db, 'mosques', id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() };
    }
    return null;
}

export async function updateMosqueProfile(mosqueId, data) {
    const mosqueRef = doc(db, 'mosques', mosqueId);
    await updateDoc(mosqueRef, data);
}

// --- Announcement Services ---

export async function createAnnouncement(mosqueId, message) {
    const announcementsRef = collection(db, `mosques/${mosqueId}/announcements`);
    await addDoc(announcementsRef, {
        message,
        createdAt: new Date().toISOString()
    });
}

export async function getAnnouncements(mosqueId) {
    const announcementsRef = collection(db, `mosques/${mosqueId}/announcements`);
    const q = query(announcementsRef); // You might want to order by date
    const querySnapshot = await getDocs(q);
    // Sort in memory for simplicity or add orderBy to query if index exists
    return querySnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

export async function deleteAnnouncement(mosqueId, announcementId) {
    const docRef = doc(db, `mosques/${mosqueId}/announcements`, announcementId);
    await deleteDoc(docRef);
}

export function subscribeToAnnouncements(mosqueId, callback) {
    const announcementsRef = collection(db, `mosques/${mosqueId}/announcements`);
    const q = query(announcementsRef);

    return onSnapshot(q, (snapshot) => {
        const data = snapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() }))
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        callback(data);
    });
}

// --- Timetable Services ---

export async function updateTimetable(mosqueId, month, timetableData) {
    // timetableData should be an array of days with prayer times
    const timetableRef = doc(db, `mosques/${mosqueId}/timetables`, month);
    await setDoc(timetableRef, { days: timetableData }, { merge: true });
}

export async function getTimetable(mosqueId, month) {
    const timetableRef = doc(db, `mosques/${mosqueId}/timetables`, month);
    const docSnap = await getDoc(timetableRef);
    if (docSnap.exists()) {
        return docSnap.data().days;
    }
    return [];
}

// --- User Services ---

export async function followMosque(userId, mosqueId) {
    const userRef = doc(db, 'users', userId);
    const mosqueRef = doc(db, 'mosques', mosqueId);

    await updateDoc(userRef, {
        following: arrayUnion(mosqueId)
    });

    await updateDoc(mosqueRef, {
        followers: arrayUnion(userId)
    });
}

export async function unfollowMosque(userId, mosqueId) {
    const userRef = doc(db, 'users', userId);
    const mosqueRef = doc(db, 'mosques', mosqueId);

    await updateDoc(userRef, {
        following: arrayRemove(mosqueId)
    });

    await updateDoc(mosqueRef, {
        followers: arrayRemove(userId)
    });
}

export async function getUserProfile(userId) {
    const docRef = doc(db, 'users', userId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
        return docSnap.data();
    }
    return null;
}

export async function saveUser(user) {
    const userRef = doc(db, 'users', user.uid);
    await setDoc(userRef, {
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        lastLogin: new Date().toISOString()
    }, { merge: true });
}

export async function getUsersByEmail(email) {
    const q = query(collection(db, 'users'), where('email', '==', email));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}
