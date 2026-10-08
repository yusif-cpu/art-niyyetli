# ArtNiyyətli: ictimai saytın ön tərəfi, yekun

Tarix: 28 sentyabr 2026. Şaxə: `frontend`.

İş on mərhələdə görülüb. Mərhələlərin commit siyahısı və plandan ayrıldığımız yerlər `docs/frontend-implementation-plan.md` faylının 11-ci bölməsindədir.

Yekun vəziyyət:

- 76 test faylı, 567 test, hamısı keçir;
- `npm run build` keçir;
- heç bir ictimai səhifədə CSP pozuntusu yoxdur.

---

## 1. Nə qurulub

| Ünvan | Səhifə | Qısa təsvir |
|---|---|---|
| `/` | Ana səhifə | Mətn hero, əsərlər həqiqi ölçüdə divarda (ilk ekranda), seçilmiş əsərlər, cari sərgi bordo zolaqda, rəssamlar, digər sərgilər, son məqalələr, "necə işləyir", suallar, əlaqə bloku |
| `/artworks` | Kataloq | Başlıq zolağı və əsər sayı, filtrlər (janr, texnika, rəssam, ölçü, qiymət, status, sıralama, ünvanda saxlanılır), əsərlər bir k ilə həqiqi ölçüdə, miqyas xətti, səhifələmə |
| `/artworks/:kod` | Əsər | Əsas şəkil (ən çoxu 6 px/sm), kiçik şəkillər, göstəricilər cədvəli, "divarda gör" (240 / 270 / 320 sm divar, 170 sm fiqur), video, sorğu forması, WhatsApp, bənzər əsərlər |
| `/artists` | Rəssamlar | Dairəvi portretli kartlar, ad, istiqamət və əsər sayı ortada: 4, 3 və 1 sütun |
| `/artists/:slug` | Rəssam | Yığcam başlıq, əsərləri divarda, tərcümeyi-hal və yaradıcılıq yanaşması iki sütunda, sərgi tarixçəsi, mükafatlar, sorğu keçidi |
| `/exhibitions` | Sərgilər | Cari, gələcək və arxiv qrupları; arxiv səhifələnir |
| `/exhibitions/:slug` | Sərgi | Başlıq, tarix, məkan, status və mətn bir blokda; sərgidəki əsərlər divarda; iştirakçı rəssamlar; fotolar və video; sorğu keçidi |
| `/articles` | Jurnal | Tarix və tip, başlıq, qısa mətn, üz şəkli; səhifələnir |
| `/articles/:slug` | Məqalə | Tarix və tip, Spectral başlıq, üz şəkli, video, düz mətn, digər üç məqalə |
| `/contact` | Əlaqə | Mövzu seçimi ilə sorğu forması; ünvan, telefon, e-poçt, iş saatları; "Xəritədə aç" keçidi |
| `/:slug` | CMS səhifəsi | Başlıq, mətn, bölmələr sıra ilə; mətni boş olan bölmə göstərilmir; `[PLACEHOLDER]` gizlədilmir |
| başqa ünvan | 404 | Qısa mətn, ana səhifəyə və kataloqa keçid, `noindex` |

Bütün səhifələrdə eyni hallar var:

- **yüklənir:** statik skelet, parıldama yoxdur, `aria-busy`;
- **boş:** qısa mətn, `ink-muted`;
- **xəta:** `signal-ink` və təkrar yükləmə;
- **tapılmadı:** müvafiq mətn və geri keçid.

Hər iki dil (AZ, EN) dəstəklənir. SEO başlığı və təsviri admin paneldən gələn `seo` sahəsi ilə dəyişdirilə bilir.

## 2. Divar konsepsiyası

Hər əsər eyni miqyasda çəkilir: bir santimetr ekranda `k` piksel olur. Bir görünüşdə bütün əsərlər və 170 sm-lik insan fiquru eyni k ilə çəkilir, ona görə 180 sm-lik əsər 40 sm-likdən düz 4,5 dəfə böyük görünür.

**Ana səhifə divarı:**

- k mövcud hündürlükdən hesablanır: ekran hündürlüyünün 58%-i, 320 ilə 640 piksel arasında.
- Divar 270 sm-dir, əsərlərin mərkəzi döşəmədən 150 sm yuxarıdadır.
- Əsərlər arası aralıq: `max(43 sm × k, 48 px, yazıların daşması + 24 px)`.
- Divar üfüqi sürüşür, klaviatura ilə idarə olunur, "1 / N" sayğacı var.
- 768 pikseldən aşağıda divar şaquli siyahıya çevrilir:
  - k eni ilə hesablanır;
  - aralıq `max(20 sm × k, 48 px)`-dir;
  - ən hündür əsər ekran hündürlüyünün 60%-indən çox ola bilməz.

**Əsər səhifəsi:**

- "Divarda gör" əsəri 240, 270 və ya 320 sm-lik divarda fiqurun yanında göstərir, ən çoxu 1,6 px/sm.
- Əsas şəkil ən çoxu 6 px/sm ilə göstərilir.

**Kataloq, seçilmiş əsərlər və bənzər əsərlər** öz k-sı olan şəbəkələrdir. Yanlarında miqyas xətti var (1 m, sığmayanda 50, 20, 10 və ya 5 sm), ki fərqli görünüşlər müqayisə oluna bilsin.

**Divarın işləndiyi səhifələr:**

| Yer | Komponent |
|---|---|
| ana səhifə, rəssam səhifəsi, sərgi səhifəsi | `HomeWall` |
| əsər səhifəsi | `DetailWallView` və əsas sahə |
| kataloq, seçilmiş və bənzər əsərlər | `ScaledArtworkGrid` |

Bütün hesablama bir yerdədir: `lib/wall.js`, testləri ilə.

## 3. Dizayn sistemi

**Rənglər** (`resources/css/public.css`):

| Token | Dəyər | İşlənmə |
|---|---|---|
| `surface` | #F4F0E8 | səhifə fonu |
| `surface-raised`, `surface-field-3` | #FAF8F3 | forma sahələri, divarın səthi |
| `surface-field`, `surface-field-2` | #EAE4D8, #DDD5C5 | şəkli olmayan əsər və portret sahələri |
| `ink` | #1A1614 | mətn (fonda 15,8:1) |
| `ink-muted` | #6B625C | köməkçi mətn (5,2:1) |
| `line` / `line-strong` | #DDD6CA / #908A82 | bəzək xətti / interaktiv kənar (3,0:1) |
| `signal` / `signal-ink` | #F51000 / #DA0F02 | aktiv menyu, fokus halqası / kiçik qırmızı mətn, xəta (4,56:1) |
| `brand` | #FC0203 | yalnız loqo, header və footer (açıq fonda 3,59:1, bordoda 4,10:1); müştərinin raster faylından ölçülüb, kitabçanın rəsmi dəyəri gələndə yenilənir |
| `wine` / `wine-ink` / `wine-ink-muted` | #3E0B0A / #F4F0E8 / #B9A9A4 | footer, bordo zolaq, dolu düymə (14,7:1 və 7,4:1) |

**Şriftlər:** Montserrat (interfeys və başlıqlar), Spectral (oxunan mətn, əsər adları kursivlə). İkisi də saytın öz serverindən yüklənir, latin-ext alt dəstləri ilə.

**Tipoqrafiya səviyyələri:**

| Səviyyə | Ölçü | İşlənmə |
|---|---|---|
| `hero` | clamp(40, 6vw, 72) | ana səhifə başlığı |
| `display` | clamp(38, 4.6vw, 59) | səhifə başlığı, rəssamın adı |
| `heading` | clamp(28, 3.4vw, 48) | bölmə başlığı, detal başlıqları |
| `subheading` | 20 | kiçik bölmə başlığı |
| `lead` / `reading` / `reading-sm` | 19 / 17 / 15 | Spectral mətn |
| `ui` / `nav` / `meta` / `byline` / `label` / `caption` | 15 / 14 / 13 / 13 / 12 / 11 | interfeys mətni |

Telefonda (768 pikseldən aşağıda) 11-13 piksellik səviyyələr 14 piksələ qalxır.

**Boşluqlar:**

- `step-1`-dən `step-10`-a qədər: 4, 8, 12, 16, 24, 32, 48, 64, 96, 144 piksel;
- səhifə kənarı `clamp(32, 5vw, 96)`: 1024-də 32, 760-da 20 piksel;
- bölmələr arası 96 piksel (`step-9`).

**Komponent qaydaları:**

- bölmə başlığının üstündə kiçik etiket (`SectionHeading`);
- siyahı səhifələrində başlıq zolağı (`PageHeader`);
- loqo inline SVG-dir, `currentColor` ilə, həm header-də, həm bordo footer-də marka qırmızısı (`text-brand`). Header-də nişan və yanında iki sətirli yazı, footer-də eyni lockup böyük ölçüdə, tək nişan yalnız 400 pikseldən dar header-də (və favicon-da);
- telefonda bütün kliklənən elementlər ən azı 44 × 44 pikseldir.

**Qadağalar:**

- qradiyent yoxdur;
- kölgə yalnız divara asılmış əsərdədir (`shadow-hang`);
- yumru künc yoxdur (`--radius-input: 0`). Tək istisna müştərinin qərarıdır: rəssam kartlarındakı portret (rəssamlar siyahısı və ana səhifənin rəssamlar bloku) tam dairədir, şəkil kvadrat kəsilir. Rəssamın öz səhifəsində və sərgi səhifəsində portret 4:5 düzbucaqlı qalır;
- təkrarlanan animasiya yoxdur (tək istisna: yüklənmə göstəricisi, aşağıda "Maskot");
- böyük hərfli etiket yoxdur;
- Signal bir ekranda ən çoxu üç dəfədir və heç vaxt fon deyil. Bu büdcə səhifənin sakit vəziyyətinə aiddir: xəta görünəndə (API xətası, forma və ya aralıq doğrulaması) ekranda üçdən çox qırmızı element ola bilər, çünki xəta görünməlidir; bu halda aktiv filtr sayı kimi məlumat elementləri Signal-ı itirir. Marka qırmızısı loqoda işlənir və üç Signal büdcəsinə daxil deyil: `--color-signal` və `--color-brand` rəngləri yaxın olsa da, rolları ayrı olduğu üçün ayrı tokenlərdir;
- CSP: inline skript və `<style>` yoxdur, `100vh` işlənmir, xarici şrift və xəritə çərçivəsi yoxdur.

### Maskot (ilan)

`MascotSnake` komponenti, rəngi `currentColor` ilə çağırış yerindən gəlir. Hər üç yerdə `text-brand`. Marka qırmızısıdır, Signal büdcəsinə daxil deyil. Gözü deşikdir (`evenodd`), altdakı fonun rəngini göstərir.

**Üç istifadə yeri (dördüncü əlavə olunmur):**

1. **Ana səhifənin möhür bloku:** son bölmə ilə footer arasında, mərkəzdə. Yuxarıda lockup, altında ilan (`draw`, 1300 ms, eni 420 piksel və ya məzmun eni). Blok ekranın 40%-ə qədər görünəndə bir dəfə cızılır, sonra observer ayrılır, scroll ilə təkrarlanmır. Dekorativdir, ekran oxuyucudan gizlidir.
2. **Yüklənmə göstəricisi:** hər hansı API sorğusu gedərkən ekranın üst kənarında, mərkəzdə, 240 piksel (`travel`: gövdənin 0.18 uzunluğunda parçası quyruqdan başa doğru sürünür, bir dövr 1200 ms, başı yoxdur). Sorğular bitəndə DOM-dan çıxır. Ekran oxuyucu üçün `role="status"` ilə "Yüklənir..." mətni. Səhifələrin statik skeletonları qalır.
3. **404 və "tapılmadı" ekranları:** başlığın üstündə, səhifə açılanda bir dəfə cızılır (`draw`, 1100 ms), sonra sakit qalır.

**Hərəkət qaydaları:**

- yalnız `stroke-dashoffset` və başın şəffaflığı dəyişir, element dönmür və yerini dəyişmir;
- baş gövdə bitəndən sonra 180 ms ərzində görünür;
- sadə `ease-out`, sıçrayış yoxdur;
- keyframe-lər `public.css`-dədir, sinif adları ilə; inline `style` və React `style={{}}` yoxdur;
- `prefers-reduced-motion: reduce` olanda animasiya sinfi qoşulmur: `draw` dərhal tam cızılmış (başı ilə), `travel` sakit tam xətt kimi görünür;
- dövri hərəkət yalnız yüklənmə göstəricisində var, çünki o dekorasiya deyil, vəziyyət göstəricisidir.

**Mənbə fayl müvəqqətidir.** `brand/maskot-ilan.svg` bizim çəkdiyimiz variantdır. Komponent bu faylı build zamanı mətn kimi oxuyur (`?raw`) və yalnız həndəsəni götürür, path məlumatı başqa yerdə təkrarlanmır. Müştərinin maskot vektoru gələndə yalnız bu fayl dəyişir. Şərt: yeni faylda eyni quruluş qalmalıdır: `stroke` ilə çəkilmiş `.ilan-govde` (`pathLength="1"`), doldurulmuş `.ilan-bas` qrupu, göz `evenodd` ilə deşik.

## 4. Backend-dən gözlənilən açıq maddələr

| Kod | Nə | Hazırda |
|---|---|---|
| S9 | Rəssamın əsər sayı (`artworks_count`) siyahıda | Kartda sahə hazırdır, dəyər gələndə özü görünəcək |
| S10 | Sərgidəki rəssamların `portrait_url`-i | Portret yerində slug-a görə rəngli sahə var |
| S12 (təklif) | Ana səhifənin "steps" bölməsi üçün elementli quruluş | İndi tək başlıq və mətn kimi göstərilir |
| S1 | Analitika | CSP və razılıq (cookie) qərarı lazımdır, qurulmayıb |

Həll olunanlar:

- **S3:** əsərin `artist` obyektində artıq `slug` var. Müvəqqəti həll (rəssam indeksi) silindi: əsər səhifəsi `/artists` sorğusu göndərmir, slug yoxdursa ad sadə mətndir.
- **S5:** ana səhifə artıq cari və gələcək sərgi siyahılarını qaytarır.
- **S6:** detal səhifələrində `seo` sahəsi var.
- **S11** lazım deyil: loqo SVG ilə həll olundu.

## 5. Müştəridən gözlənilən məzmun

- **Hüquqi mətnlər:** `privacy-policy`, `terms`, `shipping-returns`, `copyright`. Dördü də indi `[PLACEHOLDER]`-dir. Ana səhifə, "Haqqımızda" və "Əlaqə" səhifələrinin mətni də yer tutucudur.
- **Əsər şəkilləri:** real fotolar, `main` şəkil kətanın kənarından kəsilmiş şəkildə, çünki sahə santimetrlə qurulur.
- **Əlaqə məlumatları:** ünvan, telefon, e-poçt, iş saatları, WhatsApp nömrəsi. Admin paneldəki sayt ayarlarında doldurulmalıdır.
- **Rəssam portretləri:** heç bir rəssamın portreti yoxdur.
- **Məqalələr və sərgi fotoları.**
- **EN tərcümələr:** CMS məzmunu üçün.
- **Loqo:** SVG faylları brend kitabçasından çıxarılıb. Müştəri son variantı təsdiq etməlidir.
- **Demo faylı:** onun şəkilləri süni intellektlə yaradılıb. Müştəriyə göstəriləcəksə, bu açıq deyilməlidir.

## 6. Bilinən məhdudiyyətlər və gələcək işlər

- **Ölçülməyənlər:** Lighthouse; istehsal serverində `enforce` rejimində CSP; real cihazlar. Bütün yoxlamalar başsız Edge-də cihaz emulyasiyası ilə aparılıb.
- **Performans:**
  - public JS 320 KB-dır (sıxılmış 96 KB); bunun 219 KB-ı React-dır, admin ilə ortaqdır;
  - səhifələr ayrıca hissələrə bölünmür (code splitting yoxdur);
  - şriftlər 6 fayl, 194 KB-dır; bir səhifədə 2-6 fayl yüklənir.
- **Şəkillər:** API şəklin eni və hündürlüyünü vermir. Sahə santimetrlə qurulur; real fotonun nisbəti fərqli olarsa, şəkil sahənin içində `contain` ilə yerləşir.
- **Təmizlik:**
  - `BrandMark` artıq işlənmir;
  - `LoadingState`, `EmptyState`, `ExhibitionCard` yalnız testlərdə işlənir.
- **Testlər:** tam paketdə bir dəfə bir testin 5 saniyəlik limiti yüklənmədən keçildi (NotFoundPage). Yenidən işlədəndə keçdi. Paket iki işçi ilə təxminən 55-70 saniyə çəkir.
- **Brauzerin mətn böyütməsi:** ölçülər pikseldədir. Səhifə böyütməsi (200%) yoxlanılıb və dağılmır. Mobil sistemin şrift ölçüsü ayarı ilə yoxlama aparılmayıb.
