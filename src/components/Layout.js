import Navbar from './Navbar';
import Head from 'next/head';

export default function Layout({ children }) {
    return (
        <>
            <Head>
                <link rel="preconnect" href="https://fonts.googleapis.com" />
                <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="true" />
                <link href="https://fonts.googleapis.com/css2?family=Amiri:ital,wght@0,400;0,700;1,400&family=Inter:wght@400;500;600&display=swap" rel="stylesheet" />
            </Head>
            <div className="app-wrapper">
                <Navbar />
                <main className="main-content">
                    {children}
                </main>
                <footer className="footer">
                    <div className="container">
                        <p>&copy; {new Date().getFullYear()} Mosque Connect. Serving the Ummah.</p>
                    </div>
                </footer>
            </div>
        </>
    );
}
