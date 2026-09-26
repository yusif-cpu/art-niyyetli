export const SEO_DESCRIPTION_MAX = 160;

const EMPTY = { title: '', description: '', og_image_id: null, og_image_url: null };

/** API `seo` list (one row per locale) -> editor state keyed by locale. */
export function seoToState(list) {
    const state = { az: { ...EMPTY }, en: { ...EMPTY } };
    (list || []).forEach((row) => {
        state[row.locale] = {
            title: row.title ?? '',
            description: row.description ?? '',
            og_image_id: row.og_image_id ?? null,
            og_image_url: row.og_image_url ?? null,
        };
    });

    return state;
}

/**
 * Editor state -> API payload. Both locales are always sent: an entry with every value empty clears that locale's
 * override on the server, so emptying the fields in the editor is how an override is removed.
 */
export function seoToPayload(state) {
    return ['az', 'en'].map((locale) => ({
        locale,
        title: state[locale].title || null,
        description: state[locale].description || null,
        og_image_id: state[locale].og_image_id || null,
    }));
}

/** Validation errors for one locale's entry, from the API's `seo.{index}.{field}` keys (az is 0, en is 1). */
export function seoErrors(errors, locale) {
    const index = locale === 'az' ? 0 : 1;

    return {
        title: errors?.[`seo.${index}.title`]?.[0],
        description: errors?.[`seo.${index}.description`]?.[0],
        og_image_id: errors?.[`seo.${index}.og_image_id`]?.[0],
        general: errors?.[`seo.${index}.locale`]?.[0] || errors?.seo?.[0],
    };
}
