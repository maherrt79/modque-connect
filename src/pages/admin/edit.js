import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/context/AuthContext';
import { getUserProfile, getMosqueById, updateMosqueProfile, deleteMosque, addAdminToMosque } from '@/services/db';

export default function EditMosque() {
    const { user } = useAuth();
    const router = useRouter();
    const [mosqueId, setMosqueId] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        address: '',
        description: '',
        website: '',
        facebook: '',
        instagram: '',
        twitter: '',
        youtube: '',
        latitude: '',
        longitude: ''
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [admins, setAdmins] = useState([]);
    const [newAdminEmail, setNewAdminEmail] = useState('');
    const [addingAdmin, setAddingAdmin] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);

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
                const mosqueData = await getMosqueById(queryMosqueId);
                if (mosqueData) {
                    setFormData({
                        name: mosqueData.name || '',
                        address: mosqueData.address || '',
                        description: mosqueData.description || '',
                        website: mosqueData.website || '',
                        facebook: mosqueData.facebook || '',
                        instagram: mosqueData.instagram || '',
                        twitter: mosqueData.twitter || '',
                        youtube: mosqueData.youtube || '',
                        latitude: mosqueData.location?.latitude || '',
                        longitude: mosqueData.location?.longitude || ''
                    });

                    // Fetch admins
                    if (mosqueData.adminIds) {
                        const adminProfiles = await Promise.all(mosqueData.adminIds.map(id => getUserProfile(id)));
                        setAdmins(adminProfiles.filter(p => p)); // Filter out nulls
                    }
                }
            } else {
                alert("Unauthorized");
                router.push('/admin/dashboard');
            }
            setLoading(false);
        });
    }, [user, router.isReady, router.query]);

    const handleDeleteClick = () => {
        setShowDeleteModal(true);
    };

    const confirmDelete = async () => {
        try {
            await deleteMosque(mosqueId);
            alert('Mosque deleted successfully.');
            router.push('/admin/dashboard');
        } catch (error) {
            console.error(error);
            alert('Error deleting mosque.');
        } finally {
            setShowDeleteModal(false);
        }
    };

    const handleAddAdmin = async (e) => {
        e.preventDefault();
        setAddingAdmin(true);
        try {
            await addAdminToMosque(mosqueId, newAdminEmail);
            alert('Admin added successfully!');
            setNewAdminEmail('');
            // Refresh admins
            const mosqueData = await getMosqueById(mosqueId);
            if (mosqueData && mosqueData.adminIds) {
                const adminProfiles = await Promise.all(mosqueData.adminIds.map(id => getUserProfile(id)));
                setAdmins(adminProfiles.filter(p => p));
            }
        } catch (error) {
            console.error(error);
            alert('Error adding admin: ' + error.message);
        } finally {
            setAddingAdmin(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const dataToSave = {
                ...formData,
                location: {
                    latitude: formData.latitude,
                    longitude: formData.longitude
                }
            };
            // Remove flat lat/lng from root if you prefer, or keep them. 
            // Ideally we clean up the object before saving to match schema.
            delete dataToSave.latitude;
            delete dataToSave.longitude;

            await updateMosqueProfile(mosqueId, dataToSave);
            alert('Profile updated successfully!');
            router.push('/admin/dashboard');
        } catch (error) {
            console.error(error);
            alert('Error updating profile');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="container" style={{ padding: '2rem' }}>Loading...</div>;

    return (
        <div className="container" style={{ padding: '2rem 1rem', maxWidth: '600px' }}>
            <h1 style={{ fontSize: '2rem', marginBottom: '2rem' }}>Edit Mosque Profile</h1>

            <form onSubmit={handleSubmit} className="card">
                <div style={{ marginBottom: '1.5rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>Mosque Name</label>
                    <input
                        type="text"
                        className="input"
                        required
                        value={formData.name}
                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                    />
                </div>

                <div style={{ marginBottom: '1.5rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>Address</label>
                    <input
                        type="text"
                        className="input"
                        required
                        value={formData.address}
                        onChange={e => setFormData({ ...formData, address: e.target.value })}
                    />
                </div>

                <div style={{ marginBottom: '1.5rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>Description</label>
                    <textarea
                        className="input"
                        rows="4"
                        value={formData.description}
                        onChange={e => setFormData({ ...formData, description: e.target.value })}
                    />
                </div>

                <div style={{ marginBottom: '1.5rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>Website URL</label>
                    <input
                        type="url"
                        className="input"
                        value={formData.website || ''}
                        onChange={e => setFormData({ ...formData, website: e.target.value })}
                        placeholder="https://example.com"
                    />
                </div>

                <div style={{ marginBottom: '1.5rem' }}>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '1rem' }}>Social Media</h3>
                    <div style={{ display: 'grid', gap: '1rem' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.25rem' }}>Facebook</label>
                            <input
                                type="url"
                                className="input"
                                value={formData.facebook || ''}
                                onChange={e => setFormData({ ...formData, facebook: e.target.value })}
                                placeholder="Facebook Profile URL"
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.25rem' }}>Instagram</label>
                            <input
                                type="url"
                                className="input"
                                value={formData.instagram || ''}
                                onChange={e => setFormData({ ...formData, instagram: e.target.value })}
                                placeholder="Instagram Profile URL"
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.25rem' }}>Twitter / X</label>
                            <input
                                type="url"
                                className="input"
                                value={formData.twitter || ''}
                                onChange={e => setFormData({ ...formData, twitter: e.target.value })}
                                placeholder="Twitter Profile URL"
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.25rem' }}>YouTube</label>
                            <input
                                type="url"
                                className="input"
                                value={formData.youtube || ''}
                                onChange={e => setFormData({ ...formData, youtube: e.target.value })}
                                placeholder="YouTube Channel URL"
                            />
                        </div>
                    </div>
                </div>

                <div style={{ marginBottom: '1.5rem' }}>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '1rem' }}>Location</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.25rem' }}>Latitude</label>
                            <input
                                type="number"
                                step="any"
                                className="input"
                                value={formData.latitude || ''}
                                onChange={e => setFormData({ ...formData, latitude: e.target.value })}
                                placeholder="e.g. 21.4225"
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.25rem' }}>Longitude</label>
                            <input
                                type="number"
                                step="any"
                                className="input"
                                value={formData.longitude || ''}
                                onChange={e => setFormData({ ...formData, longitude: e.target.value })}
                                placeholder="e.g. 39.8262"
                            />
                        </div>
                    </div>
                    <p style={{ fontSize: '0.8rem', color: 'var(--muted-foreground)', marginTop: '0.5rem' }}>
                        Used for map display and prayer time calculations.
                    </p>
                </div>

                <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={saving}>
                    {saving ? 'Saving...' : 'Save Changes'}
                </button>
            </form>

            <div className="card" style={{ marginTop: '2rem' }}>
                <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Manage Admins</h2>
                <ul style={{ listStyle: 'none', padding: 0, marginBottom: '1.5rem' }}>
                    {admins.map(admin => (
                        <li key={admin.uid || admin.email} style={{ padding: '0.5rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: 'var(--muted)', overflow: 'hidden' }}>
                                {admin.photoURL ? <img src={admin.photoURL} alt={admin.displayName} style={{ width: '100%', height: '100%' }} /> : null}
                            </div>
                            <div>
                                <div style={{ fontWeight: '600' }}>{admin.displayName || 'User'}</div>
                                <div style={{ fontSize: '0.85rem', color: 'var(--muted-foreground)' }}>{admin.email}</div>
                            </div>
                        </li>
                    ))}
                </ul>

                <form onSubmit={handleAddAdmin} style={{ display: 'flex', gap: '0.5rem' }}>
                    <input
                        type="email"
                        placeholder="Enter email to add admin"
                        className="input"
                        required
                        value={newAdminEmail}
                        onChange={e => setNewAdminEmail(e.target.value)}
                        style={{ flex: 1 }}
                    />
                    <button type="submit" className="btn btn-secondary" disabled={addingAdmin}>
                        {addingAdmin ? 'Adding...' : 'Add Admin'}
                    </button>
                </form>
            </div>

            <div className="card" style={{ marginTop: '2rem', border: '1px solid var(--destructive)', backgroundColor: 'var(--destructive-foreground)' }}>
                <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: 'var(--destructive)' }}>Danger Zone</h2>
                <p style={{ marginBottom: '1rem' }}>Deleting this mosque will remove all data and cannot be undone.</p>
                <button onClick={handleDeleteClick} className="btn" style={{ backgroundColor: 'var(--destructive)', color: 'white', width: '100%' }}>
                    Delete Mosque
                </button>
            </div>

            {showDeleteModal && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000
                }}>
                    <div className="card" style={{ maxWidth: '400px', width: '90%', padding: '2rem' }}>
                        <h3 style={{ fontSize: '1.25rem', marginBottom: '1rem', color: 'var(--destructive)' }}>Delete Mosque?</h3>
                        <p style={{ marginBottom: '1.5rem' }}>
                            Are you sure you want to delete this mosque? This action cannot be undone and will remove all associated data.
                        </p>
                        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                            <button
                                onClick={() => setShowDeleteModal(false)}
                                className="btn"
                                style={{ backgroundColor: 'var(--muted)', color: 'var(--foreground)' }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmDelete}
                                className="btn"
                                style={{ backgroundColor: 'var(--destructive)', color: 'white' }}
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
