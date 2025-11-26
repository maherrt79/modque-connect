import { initializeApp, getApps } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getMessaging } from 'firebase/messaging';

const firebaseConfig = {
    apiKey: "AIzaSyAG14RYHkY19T1oNMyUsWVz7-fWqQ5XDfU",
    authDomain: "mymosque-d921d.firebaseapp.com",
    projectId: "mymosque-d921d",
    storageBucket: "mymosque-d921d.firebasestorage.app",
    messagingSenderId: "489279198086",
    appId: "1:489279198086:web:25a4628f34bdf88af9d207",
    measurementId: "G-PMDVZVBSWY"
};

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

// Messaging is only supported in browser environments
let messaging = null;
if (typeof window !== 'undefined') {
    try {
        // messaging = getMessaging(app); 
        // Note: Messaging requires a service worker and valid VAPID key
    } catch (e) {
        console.log('Firebase messaging not supported in this environment');
    }
}

export { auth, db, googleProvider, messaging };
