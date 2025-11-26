import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/router';

export default function Navbar() {
    const { user, logout } = useAuth();
    const router = useRouter();
    const [isOpen, setIsOpen] = useState(false);

    const isActive = (path) => router.pathname === path;

    const toggleMenu = () => setIsOpen(!isOpen);

    return (
        <nav className="navbar glass-panel">
            <div className="container navbar-content" style={{ flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                    <Link href="/" className="logo">
                        <span className="crescent">☪</span> Mosque Connect
                    </Link>

                    {/* Hamburger Button */}
                    <button
                        className="btn-icon mobile-only"
                        onClick={toggleMenu}
                        style={{ display: 'none', background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer' }}
                    >
                        {isOpen ? '✕' : '☰'}
                    </button>
                </div>

                <div className={`nav-links ${isOpen ? 'open' : ''}`}>
                    <Link href="/" className={`nav-link ${isActive('/') ? 'active' : ''}`} onClick={() => setIsOpen(false)}>
                        Home
                    </Link>

                    {user && (
                        <>
                            <Link href="/admin/dashboard" className={`nav-link ${isActive('/admin/dashboard') ? 'active' : ''}`} onClick={() => setIsOpen(false)}>
                                Mosque Admin
                            </Link>
                        </>
                    )}

                    {user ? (
                        <button onClick={() => { logout(); setIsOpen(false); }} className="btn-logout">
                            Logout
                        </button>
                    ) : (
                        <Link href="/login" className="btn btn-primary" onClick={() => setIsOpen(false)}>
                            Login
                        </Link>
                    )}
                </div>
            </div>

        </nav>
    );
}
