export const dictionary = {
    az: {
        nav: {
            home: 'Ana səhifə',
            artworks: 'Əsərlər',
            artists: 'Rəssamlar',
            exhibitions: 'Sərgilər',
            articles: 'Jurnal',
            faqs: 'Suallar',
        },
        common: {
            loading: 'Yüklənir...',
            error: 'Xəta baş verdi. Zəhmət olmasa yenidən cəhd edin.',
            empty: 'Heç nə tapılmadı.',
            retry: 'Yenidən cəhd et',
            readMore: 'Ətraflı',
            backToList: 'Siyahıya qayıt',
        },
        pagination: {
            prev: 'Əvvəlki',
            next: 'Növbəti',
            of: 'səhifə',
        },
        artwork: {
            priceOnRequest: 'Qiymət tələb üzrə',
            sold: 'Satılıb',
            reserved: 'Rezerv edilib',
            available: 'Mövcuddur',
            enquire: 'Sorğu göndər',
            contactWhatsapp: 'WhatsApp ilə əlaqə',
            similar: 'Bənzər əsərlər',
        },
        artist: {
            exhibitionHistory: 'Sərgi tarixçəsi',
            awards: 'Mükafatlar',
        },
        enquiryForm: {
            name: 'Ad',
            email: 'E-poçt',
            phone: 'Telefon (istəyə görə)',
            message: 'Mesaj',
            submit: 'Göndər',
            success: 'Sorğunuz qeydə alındı.',
            rateLimited: 'Həddindən çox sorğu göndərildi. Zəhmət olmasa bir az sonra yenidən cəhd edin.',
        },
        notFound: {
            title: 'Səhifə tapılmadı',
            body: 'Axtardığınız səhifə mövcud deyil.',
        },
        home: {
            wall: 'Divar',
            featured: 'Seçilmişlər',
            artists: 'Rəssamlar',
            faqs: 'Suallar',
        },
        filters: {
            artist: 'Rəssam',
            all: 'Hamısı',
            status: 'Status',
            sort: 'Sıralama',
            sortDefault: 'Kurator sırası',
            sortNewest: 'Ən yeni',
            sortPriceAsc: 'Qiymət (artan)',
            sortPriceDesc: 'Qiymət (azalan)',
            priceMin: 'Min. qiymət',
            priceMax: 'Maks. qiymət',
        },
        exhibitions: {
            all: 'Hamısı',
            current: 'Cari',
            upcoming: 'Qarşıdan gələn',
            archive: 'Arxiv',
            participatingArtists: 'İştirakçı rəssamlar',
        },
        contact: {
            title: 'Əlaqə',
            subjectLabel: 'Mövzu',
        },
    },
    en: {
        nav: {
            home: 'Home',
            artworks: 'Artworks',
            artists: 'Artists',
            exhibitions: 'Exhibitions',
            articles: 'Journal',
            faqs: 'FAQ',
        },
        common: {
            loading: 'Loading...',
            error: 'Something went wrong. Please try again.',
            empty: 'Nothing found.',
            retry: 'Retry',
            readMore: 'Read more',
            backToList: 'Back to list',
        },
        pagination: {
            prev: 'Previous',
            next: 'Next',
            of: 'of',
        },
        artwork: {
            priceOnRequest: 'Price on request',
            sold: 'Sold',
            reserved: 'Reserved',
            available: 'Available',
            enquire: 'Send enquiry',
            contactWhatsapp: 'Contact via WhatsApp',
            similar: 'Similar artworks',
        },
        artist: {
            exhibitionHistory: 'Exhibition history',
            awards: 'Awards',
        },
        enquiryForm: {
            name: 'Name',
            email: 'Email',
            phone: 'Phone (optional)',
            message: 'Message',
            submit: 'Send',
            success: 'Your enquiry has been recorded.',
            rateLimited: 'Too many requests. Please try again later.',
        },
        notFound: {
            title: 'Page not found',
            body: 'The page you are looking for does not exist.',
        },
        home: {
            wall: 'Wall',
            featured: 'Featured',
            artists: 'Artists',
            faqs: 'FAQ',
        },
        filters: {
            artist: 'Artist',
            all: 'All',
            status: 'Status',
            sort: 'Sort',
            sortDefault: 'Curated order',
            sortNewest: 'Newest',
            sortPriceAsc: 'Price (low to high)',
            sortPriceDesc: 'Price (high to low)',
            priceMin: 'Min price',
            priceMax: 'Max price',
        },
        exhibitions: {
            all: 'All',
            current: 'Current',
            upcoming: 'Upcoming',
            archive: 'Archive',
            participatingArtists: 'Participating artists',
        },
        contact: {
            title: 'Contact',
            subjectLabel: 'Subject',
        },
    },
};

export function t(locale, path) {
    const segments = path.split('.');
    const resolve = (dict) => segments.reduce((node, segment) => node?.[segment], dict);

    return resolve(dictionary[locale]) ?? resolve(dictionary.az) ?? path;
}
