import CatalogTermsScreen from './CatalogTermsScreen.jsx';

const LABELS = {
    title: 'Janrlar',
    newButton: 'Yeni janr',
    saved: 'Janr yadda saxlanıldı',
    deleted: 'Janr silindi',
    empty: 'Hələ heç bir janr yoxdur',
    confirmDelete: 'Janrı silmək istədiyinizə əminsiniz?',
    loadError: 'Janrları yükləmək mümkün olmadı. Zəhmət olmasa yenidən cəhd edin.',
};

export default function GenresScreen() {
    return <CatalogTermsScreen endpoint="/genres" labels={LABELS} />;
}
