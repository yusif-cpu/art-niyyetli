import { useState } from 'react';
import { apiFetch, ApiError } from '../lib/api.js';
import Button from '../components/Button.jsx';
import TextField from '../components/TextField.jsx';
import Banner from '../components/Banner.jsx';

export default function LoginScreen({ onLoggedIn }) {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    async function submit(e) {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            await apiFetch('/login', { method: 'POST', body: { username, password } });
            const dashboard = await apiFetch('/dashboard');
            onLoggedIn(dashboard);
        } catch (err) {
            if (err instanceof ApiError) {
                setError(err.errors?.username?.[0] || err.message);
            } else {
                setError('Giriş zamanı xəta baş verdi.');
            }
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-neutral-100 px-4">
            <form onSubmit={submit} className="w-full max-w-sm rounded-lg bg-white p-8 shadow-sm">
                <h1 className="mb-6 text-lg font-semibold text-neutral-900">ArtNiyyətli — Admin</h1>

                <div className="space-y-4">
                    <TextField label="İstifadəçi adı" value={username} onChange={setUsername} autoComplete="username" required />
                    <TextField
                        label="Şifrə"
                        type="password"
                        value={password}
                        onChange={setPassword}
                        autoComplete="current-password"
                        required
                    />
                </div>

                {error && (
                    <div className="mt-4">
                        <Banner type="error">{error}</Banner>
                    </div>
                )}

                <Button type="submit" loading={loading} className="mt-6 w-full">
                    Daxil ol
                </Button>
            </form>
        </div>
    );
}
