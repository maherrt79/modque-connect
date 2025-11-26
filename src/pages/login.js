import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/router';
import { useEffect } from 'react';

export default function Login() {
    const { user, login } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (user) {
            router.push('/');
        }
    }, [user, router]);

    return (
        <div className="container" style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center' }}>
            <div className="card" style={{ textAlign: 'center', maxWidth: '400px', width: '100%' }}>
                <h1 style={{ marginBottom: '1rem', fontSize: '2rem', fontWeight: 'bold' }}>Mosque Connect</h1>
                <p style={{ marginBottom: '2rem', color: 'var(--muted-foreground)' }}>
                    Sign in to manage your mosque or follow prayer times.
                </p>

                <button onClick={login} className="btn btn-primary" style={{ width: '100%' }}>
                    Sign in with Google
                </button>
            </div>
        </div>
    );
}
