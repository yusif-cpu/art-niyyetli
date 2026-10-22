/**
 * The krem-bordo buttons (this cancels the earlier "no boxed button outside forms" rule): square corners, 14px 600,
 * 17px × 30px padding, a 44px touch box at least. Two kinds on two surfaces:
 *   cream: primary — wine fill, surface text;   secondary — 1px wine line, wine text
 *   wine:  primary — surface fill, wine text;   secondary — 1px surface line at 55%, surface text
 * Every button carries a 1px border (transparent on the filled ones), so a primary and a secondary side by side are
 * the same height.
 */
const BASE =
    'inline-flex min-h-11 cursor-pointer items-center justify-center border px-[29px] py-[16px] text-center text-[14px] leading-[1.2] font-semibold whitespace-nowrap transition-colors duration-150 ease-standard disabled:cursor-default disabled:opacity-50';

const KINDS = {
    cream: {
        primary: 'border-transparent bg-wine text-surface hover:bg-wine-deep',
        secondary: 'border-wine text-wine hover:bg-wine hover:text-surface',
    },
    wine: {
        primary: 'border-transparent bg-surface text-wine hover:bg-wine-accent',
        secondary: 'border-surface/55 text-surface hover:border-surface',
    },
};

export function buttonClass(kind = 'primary', surface = 'cream') {
    return `${BASE} ${KINDS[surface]?.[kind] ?? KINDS.cream.primary}`;
}

/** A plain link on cream ("Bütün əsərlər"): the text with a 1px line under it, in wine, on a 44px touch box. */
export const LINE_LINK = 'inline-flex min-h-11 shrink-0 items-center text-[14px] font-semibold text-wine';
