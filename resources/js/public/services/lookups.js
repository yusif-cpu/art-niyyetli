import { publicApiFetch } from '../lib/api.js';

// E18 / E19: active genres and mediums, { slug, name, sort_order }, not paginated. The slug is the filter value.
export function listGenres(locale) {
    return publicApiFetch('/genres', { locale });
}

export function listMediums(locale) {
    return publicApiFetch('/mediums', { locale });
}
