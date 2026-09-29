<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Validation Language Lines
    |--------------------------------------------------------------------------
    |
    | Azerbaijani translation of Laravel's default validator messages. The
    | :attribute etc. placeholders are Laravel's own and are substituted
    | automatically; only the wording around them is translated here.
    |
    */

    'accepted' => ':attribute sahəsi qəbul edilməlidir.',
    'accepted_if' => ':attribute sahəsi :other :value olduqda qəbul edilməlidir.',
    'active_url' => ':attribute sahəsi düzgün URL olmalıdır.',
    'after' => ':attribute sahəsi :date tarixindən sonra olmalıdır.',
    'after_or_equal' => ':attribute sahəsi :date tarixi və ya ondan sonra olmalıdır.',
    'alpha' => ':attribute sahəsi yalnız hərflərdən ibarət olmalıdır.',
    'alpha_dash' => ':attribute sahəsi yalnız hərf, rəqəm, tire və alt xəttdən ibarət olmalıdır.',
    'alpha_num' => ':attribute sahəsi yalnız hərf və rəqəmlərdən ibarət olmalıdır.',
    'any_of' => ':attribute sahəsi etibarsızdır.',
    'array' => ':attribute sahəsi massiv olmalıdır.',
    'array_keys' => ':attribute sahəsi yalnız bu açarları ehtiva etməlidir: :values.',
    'ascii' => ':attribute sahəsi yalnız bir baytlıq hərf-rəqəm simvollarından ibarət olmalıdır.',
    'base64' => ':attribute sahəsi düzgün Base64 sətri olmalıdır.',
    'before' => ':attribute sahəsi :date tarixindən əvvəl olmalıdır.',
    'before_or_equal' => ':attribute sahəsi :date tarixi və ya ondan əvvəl olmalıdır.',
    'between' => [
        'array' => ':attribute sahəsi :min ilə :max element arasında olmalıdır.',
        'file' => ':attribute sahəsi :min ilə :max kilobayt arasında olmalıdır.',
        'numeric' => ':attribute sahəsi :min ilə :max arasında olmalıdır.',
        'string' => ':attribute sahəsi :min ilə :max simvol arasında olmalıdır.',
    ],
    'boolean' => ':attribute sahəsi doğru və ya yanlış olmalıdır.',
    'can' => ':attribute sahəsi icazəsiz dəyər ehtiva edir.',
    'confirmed' => ':attribute təsdiqi uyğun gəlmir.',
    'contains' => ':attribute sahəsində tələb olunan dəyər yoxdur.',
    'current_password' => 'Şifrə yanlışdır.',
    'date' => ':attribute sahəsi düzgün tarix olmalıdır.',
    'date_equals' => ':attribute sahəsi :date tarixinə bərabər olmalıdır.',
    'date_format' => ':attribute sahəsi :format formatına uyğun olmalıdır.',
    'decimal' => ':attribute sahəsi :decimal onluq yerə malik olmalıdır.',
    'declined' => ':attribute sahəsi rədd edilməlidir.',
    'declined_if' => ':attribute sahəsi :other :value olduqda rədd edilməlidir.',
    'different' => ':attribute və :other fərqli olmalıdır.',
    'digits' => ':attribute sahəsi :digits rəqəmdən ibarət olmalıdır.',
    'digits_between' => ':attribute sahəsi :min ilə :max rəqəm arasında olmalıdır.',
    'dimensions' => ':attribute sahəsinin şəkil ölçüləri düzgün deyil.',
    'distinct' => ':attribute sahəsində təkrarlanan dəyər var.',
    'doesnt_contain' => ':attribute sahəsi bunlardan heç birini ehtiva etməməlidir: :values.',
    'doesnt_end_with' => ':attribute sahəsi bunlardan biri ilə bitməməlidir: :values.',
    'doesnt_start_with' => ':attribute sahəsi bunlardan biri ilə başlamamalıdır: :values.',
    'email' => ':attribute sahəsi düzgün e-poçt ünvanı olmalıdır.',
    'encoding' => ':attribute sahəsi :encoding kodlaşdırmasında olmalıdır.',
    'ends_with' => ':attribute sahəsi bunlardan biri ilə bitməlidir: :values.',
    'enum' => 'Seçilmiş :attribute etibarsızdır.',
    'exists' => 'Seçilmiş :attribute etibarsızdır.',
    'extensions' => ':attribute sahəsi bu uzantılardan birinə malik olmalıdır: :values.',
    'file' => ':attribute sahəsi fayl olmalıdır.',
    'filled' => ':attribute sahəsinin dəyəri olmalıdır.',
    'gt' => [
        'array' => ':attribute sahəsi :value elementdən çox olmalıdır.',
        'file' => ':attribute sahəsi :value kilobaytdan böyük olmalıdır.',
        'numeric' => ':attribute sahəsi :value-dan böyük olmalıdır.',
        'string' => ':attribute sahəsi :value simvoldan çox olmalıdır.',
    ],
    'gte' => [
        'array' => ':attribute sahəsi ən azı :value element olmalıdır.',
        'file' => ':attribute sahəsi :value kilobayt və ya ondan çox olmalıdır.',
        'numeric' => ':attribute sahəsi :value-a bərabər və ya ondan böyük olmalıdır.',
        'string' => ':attribute sahəsi ən azı :value simvol olmalıdır.',
    ],
    'hex_color' => ':attribute sahəsi düzgün hex rəng kodu olmalıdır.',
    'image' => ':attribute sahəsi şəkil olmalıdır.',
    'in' => 'Seçilmiş :attribute etibarsızdır.',
    'in_array' => ':attribute sahəsi :other daxilində mövcud olmalıdır.',
    'in_array_keys' => ':attribute sahəsi bu açarlardan ən azı birini ehtiva etməlidir: :values.',
    'integer' => ':attribute sahəsi tam ədəd olmalıdır.',
    'ip' => ':attribute sahəsi düzgün IP ünvanı olmalıdır.',
    'ipv4' => ':attribute sahəsi düzgün IPv4 ünvanı olmalıdır.',
    'ipv6' => ':attribute sahəsi düzgün IPv6 ünvanı olmalıdır.',
    'json' => ':attribute sahəsi düzgün JSON sətri olmalıdır.',
    'list' => ':attribute sahəsi siyahı olmalıdır.',
    'lowercase' => ':attribute sahəsi kiçik hərflərlə olmalıdır.',
    'lt' => [
        'array' => ':attribute sahəsi :value elementdən az olmalıdır.',
        'file' => ':attribute sahəsi :value kilobaytdan az olmalıdır.',
        'numeric' => ':attribute sahəsi :value-dan az olmalıdır.',
        'string' => ':attribute sahəsi :value simvoldan az olmalıdır.',
    ],
    'lte' => [
        'array' => ':attribute sahəsi :value elementdən çox ola bilməz.',
        'file' => ':attribute sahəsi :value kilobaytdan az və ya bərabər olmalıdır.',
        'numeric' => ':attribute sahəsi :value-dan az və ya bərabər olmalıdır.',
        'string' => ':attribute sahəsi :value simvoldan az və ya bərabər olmalıdır.',
    ],
    'mac_address' => ':attribute sahəsi düzgün MAC ünvanı olmalıdır.',
    'max' => [
        'array' => ':attribute sahəsi :max elementdən çox ola bilməz.',
        'file' => ':attribute sahəsi :max kilobaytdan çox ola bilməz.',
        'numeric' => ':attribute sahəsi :max-dan çox ola bilməz.',
        'string' => ':attribute sahəsi :max simvoldan çox ola bilməz.',
    ],
    'max_digits' => ':attribute sahəsi :max rəqəmdən çox ola bilməz.',
    'mimes' => ':attribute sahəsi bu tipli fayl olmalıdır: :values.',
    'mimetypes' => ':attribute sahəsi bu tipli fayl olmalıdır: :values.',
    'min' => [
        'array' => ':attribute sahəsi ən azı :min element olmalıdır.',
        'file' => ':attribute sahəsi ən azı :min kilobayt olmalıdır.',
        'numeric' => ':attribute sahəsi ən azı :min olmalıdır.',
        'string' => ':attribute sahəsi ən azı :min simvol olmalıdır.',
    ],
    'min_digits' => ':attribute sahəsi ən azı :min rəqəm olmalıdır.',
    'missing' => ':attribute sahəsi olmamalıdır.',
    'missing_if' => ':attribute sahəsi :other :value olduqda olmamalıdır.',
    'missing_unless' => ':attribute sahəsi :other :value olmadıqca olmamalıdır.',
    'missing_with' => ':attribute sahəsi :values mövcud olduqda olmamalıdır.',
    'missing_with_all' => ':attribute sahəsi :values mövcud olduqda olmamalıdır.',
    'multiple_of' => ':attribute sahəsi :value ədədinin mərtəbəsi olmalıdır.',
    'not_in' => 'Seçilmiş :attribute etibarsızdır.',
    'not_regex' => ':attribute sahəsinin formatı düzgün deyil.',
    'numeric' => ':attribute sahəsi ədəd olmalıdır.',
    'password' => [
        'letters' => ':attribute sahəsi ən azı bir hərf ehtiva etməlidir.',
        'mixed' => ':attribute sahəsi ən azı bir böyük və bir kiçik hərf ehtiva etməlidir.',
        'numbers' => ':attribute sahəsi ən azı bir rəqəm ehtiva etməlidir.',
        'symbols' => ':attribute sahəsi ən azı bir simvol ehtiva etməlidir.',
        'uncompromised' => 'Göstərilən :attribute məlumat sızmasında aşkarlanıb. Zəhmət olmasa başqa :attribute seçin.',
    ],
    'present' => ':attribute sahəsi mövcud olmalıdır.',
    'present_if' => ':attribute sahəsi :other :value olduqda mövcud olmalıdır.',
    'present_unless' => ':attribute sahəsi :other :value olmadıqca mövcud olmalıdır.',
    'present_with' => ':attribute sahəsi :values mövcud olduqda mövcud olmalıdır.',
    'present_with_all' => ':attribute sahəsi :values mövcud olduqda mövcud olmalıdır.',
    'prohibited' => ':attribute sahəsi qadağandır.',
    'prohibited_if' => ':attribute sahəsi :other :value olduqda qadağandır.',
    'prohibited_if_accepted' => ':attribute sahəsi :other qəbul edildikdə qadağandır.',
    'prohibited_if_declined' => ':attribute sahəsi :other rədd edildikdə qadağandır.',
    'prohibited_unless' => ':attribute sahəsi :other :values daxilində olmadıqca qadağandır.',
    'prohibits' => ':attribute sahəsi :other sahəsinin mövcud olmasına qadağa qoyur.',
    'regex' => ':attribute sahəsinin formatı düzgün deyil.',
    'required' => ':attribute sahəsi mütləqdir.',
    'required_array_keys' => ':attribute sahəsi bu açarlar üçün qeydlər ehtiva etməlidir: :values.',
    'required_if' => ':attribute sahəsi :other :value olduqda mütləqdir.',
    'required_if_accepted' => ':attribute sahəsi :other qəbul edildikdə mütləqdir.',
    'required_if_declined' => ':attribute sahəsi :other rədd edildikdə mütləqdir.',
    'required_unless' => ':attribute sahəsi :other :values daxilində olmadıqca mütləqdir.',
    'required_with' => ':attribute sahəsi :values mövcud olduqda mütləqdir.',
    'required_with_all' => ':attribute sahəsi :values mövcud olduqda mütləqdir.',
    'required_without' => ':attribute sahəsi :values mövcud olmadıqda mütləqdir.',
    'required_without_all' => ':attribute sahəsi :values-in heç biri mövcud olmadıqda mütləqdir.',
    'same' => ':attribute sahəsi :other ilə uyğun olmalıdır.',
    'size' => [
        'array' => ':attribute sahəsi :size element ehtiva etməlidir.',
        'file' => ':attribute sahəsi :size kilobayt olmalıdır.',
        'numeric' => ':attribute sahəsi :size olmalıdır.',
        'string' => ':attribute sahəsi :size simvol olmalıdır.',
    ],
    'starts_with' => ':attribute sahəsi bunlardan biri ilə başlamalıdır: :values.',
    'string' => ':attribute sahəsi mətn olmalıdır.',
    'timezone' => ':attribute sahəsi düzgün saat qurşağı olmalıdır.',
    'unique' => ':attribute artıq istifadə olunub.',
    'uploaded' => ':attribute yüklənə bilmədi.',
    'uppercase' => ':attribute sahəsi böyük hərflərlə olmalıdır.',
    'url' => ':attribute sahəsi düzgün URL olmalıdır.',
    'ulid' => ':attribute sahəsi düzgün ULID olmalıdır.',
    'uuid' => ':attribute sahəsi düzgün UUID olmalıdır.',

    /*
    |--------------------------------------------------------------------------
    | Custom Validation Language Lines
    |--------------------------------------------------------------------------
    |
    | Per-attribute, per-rule overrides. The two width_cm.max / height_cm.max
    | overrides already lived in StoreArtworkRequest/UpdateArtworkRequest's own
    | messages() method, which takes precedence over this file automatically,
    | so they are intentionally not duplicated here.
    |
    */

    'custom' => [
        //
    ],

    /*
    |--------------------------------------------------------------------------
    | Custom Admin Validation Messages
    |--------------------------------------------------------------------------
    |
    | Business-rule messages built by hand via $validator->errors()->add() in the
    | Admin Concerns/Validates*Payload traits, for checks that have no matching
    | built-in Laravel rule (e.g. "no two translations may share a locale").
    | Centralized here only for the messages that were duplicated verbatim
    | across several traits, so each is translated once and referenced from
    | every call site instead of the same Azerbaijani string being repeated.
    |
    */

    'custom_messages' => [
        'duplicate_locale' => 'Hər dil yalnız bir dəfə göstərilə bilər.',
        'duplicate_slug_within_locale' => 'Eyni dil daxilində təkrarlanan slug.',
        'slug_already_used_for_locale' => 'Bu slug artıq həmin dil üçün istifadə olunur.',
        'disallowed_content' => 'Bu sahədə qadağan olunmuş məzmun var (skriptlər, iframe-lər və ya hadisə-idarəedici atributlara icazə verilmir).',
        'duplicate_media_id' => 'Media siyahısında təkrarlanan media_id.',
        // Enforced both by the form request (ValidatesArtworkPayload) and, as a defense-in-depth check, by
        // ArtworkService itself — the same rule, so the same message.
        'only_one_main_image' => 'Yalnız bir şəkil əsas kimi qeyd edilə bilər.',
        // AuthController: shown identically whether the username or the password was wrong, and again for a
        // deactivated account, so a caller can never learn from the message alone which one it was.
        'invalid_credentials' => 'Daxil edilən məlumatlar qeydlərimizlə uyğun gəlmir.',
        'too_many_login_attempts' => 'Həddindən artıq giriş cəhdi. Zəhmət olmasa bir az sonra yenidən cəhd edin.',
    ],

    /*
    |--------------------------------------------------------------------------
    | Custom Validation Attributes
    |--------------------------------------------------------------------------
    |
    | Field names as they should read inside a :attribute message, matching
    | the labels already used in the admin screens. Wildcard keys such as
    | "translations.*.slug" apply to every locale entry in that array.
    |
    */

    'attributes' => [
        // Artwork
        'artist_id' => 'rəssam',
        'medium_id' => 'material/texnika',
        'genre_id' => 'janr',
        'availability' => 'vəziyyət',
        'year_created' => 'il',
        'year_sold' => 'satıldığı il',
        'width_cm' => 'en',
        'height_cm' => 'hündürlük',
        'price' => 'qiymət',
        'show_price' => 'qiyməti saytda göstər',
        'featured' => 'seçilmişlərdə göstər',
        'show_on_wall' => 'divarda göstər',
        'certificate' => 'sertifikat',
        'frame_condition' => 'çərçivə vəziyyəti',
        'delivery_note' => 'çatdırılma qeydi',
        'inventory_code' => 'inventar kodu',
        'sort_order' => 'sıralama',
        'is_active' => 'aktivlik',
        'is_visible' => 'görünürlük',

        // Media / files
        'file' => 'fayl',
        'media_id' => 'media',
        'logo_media_id' => 'loqo',
        'representation_image_id' => 'portret',
        'alt_text' => 'təsvir (alt text)',
        'alt_text.az' => 'təsvir (AZ)',
        'alt_text.en' => 'təsvir (EN)',

        // Articles / exhibitions / navigation
        'status' => 'status',
        'type' => 'növ',
        'published_at' => 'dərc tarixi',
        'start_date' => 'başlama tarixi',
        'end_date' => 'bitmə tarixi',
        'youtube_url' => 'YouTube linki',
        'youtube_video_id' => 'YouTube video ID',
        'nav_type' => 'naviqasiya növü',
        'placement' => 'yerləşdiyi yer',
        'route_key' => 'marşrut açarı',
        'page_id' => 'səhifə',
        'key' => 'açar',
        'display_mode' => 'göstərilmə tərzi',
        'logo_display_mode' => 'göstərilmə tərzi',
        'platform' => 'platforma',
        'url' => 'URL',

        // Users / auth
        'name' => 'ad',
        'email' => 'e-poçt',
        'username' => 'istifadəçi adı',
        'password' => 'şifrə',
        'roles' => 'rol',
        'roles.*' => 'rol',

        // Site settings
        'phone' => 'telefon',
        'address' => 'ünvan',
        'whatsapp_number' => 'WhatsApp nömrəsi',
        'contact_email' => 'əlaqə e-poçtu',
        'opening_hours' => 'iş saatları',
        'footer_text' => 'alt yazı mətni',
        'brand_text' => 'brend mətni',
        'internal_note' => 'daxili qeyd',

        // Enquiries
        'subject' => 'mövzu',
        'message' => 'mesaj',

        // Relations lists (artists/artworks/exhibitions/awards/media/images/items)
        'artists.*.artist_id' => 'rəssam',
        'artists.*.sort_order' => 'sıralama',
        'artworks.*.artwork_id' => 'əsər',
        'artworks.*.sort_order' => 'sıralama',
        'exhibitions.*.year' => 'il',
        'exhibitions.*.sort_order' => 'sıralama',
        'exhibitions.*.translations.*.locale' => 'dil',
        'exhibitions.*.translations.*.title' => 'başlıq',
        'exhibitions.*.translations.*.venue' => 'məkan',
        'awards.*.year' => 'il',
        'awards.*.sort_order' => 'sıralama',
        'awards.*.translations.*.locale' => 'dil',
        'awards.*.translations.*.title' => 'başlıq',
        'media.*.id' => 'media',
        'media.*.media_id' => 'media',
        'media.*.type' => 'növ',
        'media.*.sort_order' => 'sıralama',
        'images.*.id' => 'şəkil',
        'images.*.media_id' => 'media',
        'images.*.type' => 'növ',
        'images.*.sort_order' => 'sıralama',
        'images.*.is_main' => 'əsas şəkil',
        'items.*.id' => 'element',
        'items.*.sort_order' => 'sıralama',

        // SEO
        'seo.*.locale' => 'dil',
        'seo.*.title' => 'SEO başlığı',
        'seo.*.description' => 'SEO təsviri',
        'seo.*.og_image_id' => 'SEO şəkli',

        // Translations (AZ/EN locale entries shared across artworks, artists, articles, exhibitions, pages, faqs...)
        'translations' => 'tərcümələr',
        'translations.*.locale' => 'dil',
        'translations.*.slug' => 'URL (slug)',
        'translations.*.title' => 'başlıq',
        'translations.*.content' => 'məzmun',
        'translations.*.short_text' => 'qısa mətn',
        'translations.*.full_text' => 'tam mətn',
        'translations.*.short_description' => 'qısa açıqlama',
        'translations.*.provenance' => 'mənşə',
        'translations.*.venue' => 'məkan',
        'translations.*.first_name' => 'ad',
        'translations.*.last_name' => 'soyad',
        'translations.*.birth_place' => 'doğum yeri',
        'translations.*.direction' => 'yaradıcılıq istiqaməti',
        'translations.*.biography' => 'bioqrafiya',
        'translations.*.artistic_approach' => 'yaradıcılıq yanaşması',
        'translations.*.name' => 'ad',
        'translations.*.question' => 'sual',
        'translations.*.answer' => 'cavab',
        'translations.*.heading' => 'başlıq',
        'translations.*.body' => 'mətn',
        'birth_year' => 'doğum ili',
    ],

];
