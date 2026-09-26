import CatalogTermsScreen from './CatalogTermsScreen.jsx';

const LABELS = {
    title: 'Texnikalar',
    newButton: 'Yeni texnika',
    saved: 'Texnika yadda saxlanıldı',
    deleted: 'Texnika silindi',
    empty: 'Hələ heç bir texnika yoxdur',
    confirmDelete: 'Texnikanı silmək istədiyinizə əminsiniz?',
    loadError: 'Texnikaları yükləmək mümkün olmadı. Zəhmət olmasa yenidən cəhd edin.',
};

export default function MediumsScreen() {
    return <CatalogTermsScreen endpoint="/mediums" labels={LABELS} />;
}
