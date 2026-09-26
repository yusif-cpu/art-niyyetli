import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect } from 'vitest';
import PageSectionForm from '../screens/PageSectionForm.jsx';

const SUPPORTED = ['hero', 'steps', 'cta'];
const translations = [{ locale: 'az', heading: 'Başlıq', body: 'Mətn' }];

function renderForm(props) {
    const onSave = vi.fn();
    render(<PageSectionForm supportedKeys={SUPPORTED} onSave={onSave} onCancel={() => {}} errors={{}} {...props} />);

    return onSave;
}

describe('PageSectionForm section keys', () => {
    it('locks the key of a section the homepage relies on and does not send it', async () => {
        const onSave = renderForm({ section: { id: 1, key: 'hero', is_active: true, translations } });

        expect(screen.getByLabelText(/Açar/)).toBeDisabled();
        expect(screen.getByText(/dəyişdirilə bilməz/)).toBeInTheDocument();

        await userEvent.click(screen.getByRole('button', { name: 'Yadda saxla' }));

        const payload = onSave.mock.calls[0][0];
        expect(payload).not.toHaveProperty('key');
        expect(payload.translations).toEqual([{ locale: 'az', heading: 'Başlıq', body: 'Mətn' }]);
    });

    it('keeps the key of any other section editable', async () => {
        const onSave = renderForm({ section: { id: 2, key: 'promo', is_active: true, translations } });

        expect(screen.getByLabelText(/Açar/)).toBeEnabled();
        await userEvent.clear(screen.getByLabelText(/Açar/));
        await userEvent.type(screen.getByLabelText(/Açar/), 'promo-banner');
        await userEvent.click(screen.getByRole('button', { name: 'Yadda saxla' }));

        expect(onSave.mock.calls[0][0].key).toBe('promo-banner');
    });

    it('suggests the supported keys when adding a section', () => {
        renderForm({ section: null });

        expect(screen.getByLabelText(/Açar/)).toBeEnabled();
        expect(document.querySelectorAll('#section-key-suggestions option')).toHaveLength(3);
        expect(screen.getByText(/hero, steps, cta/)).toBeInTheDocument();
    });

    it('offers no suggestions or lock for a page without a key contract', () => {
        renderForm({ section: { id: 3, key: 'hero', is_active: true, translations }, supportedKeys: [] });

        expect(screen.getByLabelText(/Açar/)).toBeEnabled();
        expect(document.querySelector('#section-key-suggestions')).toBeNull();
    });

    it('shows the server error for the key', () => {
        renderForm({ section: null, errors: { key: ['The key may only contain lower-case letters.'] } });

        expect(screen.getByText('The key may only contain lower-case letters.')).toBeInTheDocument();
    });
});
