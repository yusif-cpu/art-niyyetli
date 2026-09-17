import { useState } from 'react';
import TextField from '../components/TextField.jsx';
import Toggle from '../components/Toggle.jsx';
import Button from '../components/Button.jsx';
import Banner from '../components/Banner.jsx';

const ROLE_OPTIONS = [
    { value: 'administrator', label: 'Administrator' },
    { value: 'editor', label: 'Redaktor' },
];

export default function UserForm({ user, onSave, onCancel, errors, banner }) {
    const isEdit = !!user;
    const [name, setName] = useState(user?.name || '');
    const [username, setUsername] = useState(user?.username || '');
    const [email, setEmail] = useState(user?.email || '');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState(user?.roles?.[0] || 'editor');
    const [isActive, setIsActive] = useState(user?.is_active ?? true);
    const [passwordError, setPasswordError] = useState('');

    function submit(e) {
        e.preventDefault();

        if (!isEdit && !password) {
            setPasswordError('Şifrə tələb olunur.');
            return;
        }

        setPasswordError('');

        const payload = {
            name,
            username,
            email,
            roles: [role],
            is_active: isActive,
        };

        if (password) {
            payload.password = password;
        }

        onSave(payload);
    }

    return (
        <form onSubmit={submit} className="space-y-4 rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
            <Banner type="error">{banner}</Banner>

            <TextField label="Ad" value={name} onChange={setName} error={errors?.name?.[0]} required />
            <TextField label="İstifadəçi adı" value={username} onChange={setUsername} error={errors?.username?.[0]} required />
            <TextField label="E-poçt" type="email" value={email} onChange={setEmail} error={errors?.email?.[0]} required />
            <TextField
                label={isEdit ? 'Şifrə (boş buraxsanız dəyişməyəcək)' : 'Şifrə'}
                type="password"
                value={password}
                onChange={setPassword}
                error={passwordError || errors?.password?.[0]}
                required={!isEdit}
            />

            <label className="block">
                <span className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">Rol</span>
                <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 bg-white text-neutral-900 dark:bg-neutral-900 dark:text-neutral-100"
                >
                    {ROLE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                            {option.label}
                        </option>
                    ))}
                </select>
                {errors?.roles?.[0] && <span className="mt-1 block text-sm text-red-600 dark:text-red-400">{errors.roles[0]}</span>}
            </label>

            <Toggle checked={isActive} onChange={setIsActive} label="Aktiv" />

            <div className="flex justify-end gap-2">
                <Button variant="secondary" onClick={onCancel}>
                    Ləğv et
                </Button>
                <Button type="submit">Yadda saxla</Button>
            </div>
        </form>
    );
}
