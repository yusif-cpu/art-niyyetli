import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import Emphasis, { plainText } from '../components/Emphasis.jsx';

describe('Emphasis', () => {
    it('turns *word* into an <em class="emphasis"> and keeps the rest as text', () => {
        const { container } = render(<h1><Emphasis text="Sənəti *həqiqi* ölçüsündə görün." /></h1>);
        const em = container.querySelector('em');
        expect(em).toHaveTextContent('həqiqi');
        expect(em).toHaveClass('emphasis');
        expect(container.querySelector('h1')).toHaveTextContent('Sənəti həqiqi ölçüsündə görün.');
        expect(container.querySelector('h1').textContent).not.toContain('*');
    });

    it('handles several marks, a mark at either end, and text without any', () => {
        const { container, rerender } = render(<p><Emphasis text="*Bir* əsər *gözünüzü* tutdu?" /></p>);
        expect([...container.querySelectorAll('em')].map((em) => em.textContent)).toEqual(['Bir', 'gözünüzü']);
        rerender(<p><Emphasis text="Rəssamlar" /></p>);
        expect(container.querySelector('em')).toBeNull();
        expect(container.querySelector('p')).toHaveTextContent('Rəssamlar');
    });

    it('never renders markup from the text: tags stay literal, a lone asterisk stays', () => {
        const { container } = render(<p><Emphasis text={'<b>x</b> 5 * 3 *y*'} /></p>);
        expect(container.querySelector('b')).toBeNull();
        expect(container.querySelector('p').textContent).toBe('<b>x</b> 5 * 3 y');
    });

    it('plainText drops the marks', () => {
        expect(plainText('Sənəti *həqiqi* ölçüsündə görün.')).toBe('Sənəti həqiqi ölçüsündə görün.');
        expect(plainText(null)).toBe('');
    });
});
