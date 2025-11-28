import '../styles/globals.css';
import { AuthProvider } from '../context/AuthContext';
import Layout from '@/components/Layout';

import { useRouter } from 'next/router';

export default function App({ Component, pageProps }) {
    const router = useRouter();
    const isTVMode = router.pathname.endsWith('/tv');

    if (isTVMode) {
        return (
            <AuthProvider>
                <Component {...pageProps} />
            </AuthProvider>
        );
    }

    return (
        <AuthProvider>
            <Layout>
                <Component {...pageProps} />
            </Layout>
        </AuthProvider>
    );
}
