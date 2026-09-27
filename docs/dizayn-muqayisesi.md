# Dizayn müqayisəsi: demo və canlı sayt

Tarix: 28 sentyabr 2026. Canlı sayt `cbe2ede` commitindədir (8-ci mərhələnin sonu).

Bu sənəd yalnız müqayisədir, kodda heç nə dəyişməyib.

**Necə ölçülüb.** Demo (`demo-frontend/ArtNiyyetli.html`, 8,1 MB, özünü açan paket) və canlı sayt (`http://localhost:8080`) eyni başsız Edge skripti ilə 1440×900 ölçüdə açılıb. Hər ekran üçün bunlar götürülüb:

- bölmələrin yeri və hündürlüyü;
- başlıqların hesablanmış şrift ölçüsü, çəkisi və hərf aralığı;
- şəkillərin qutuları;
- tam səhifə görüntüsü.

Görüntülər bu qovluqlardadır:

- `C:\Users\oneau\AppData\Local\Temp\artniyyetli-shots\demo` (demo);
- `...\artniyyetli-shots\live` (canlı sayt eyni skriptlə);
- `stage6`, `stage7`, `stage8`.

Demo animasiyasız rejimdə (`prefers-reduced-motion`) çəkilib, ona görə hər şey son vəziyyətindədir. Paketin içindəki fayllar (8 JPEG, 3 PNG, 38 şrift, şablon) oxunmaq üçün `/tmp/demo-x`-ə açılıb. Demo faylının özünə toxunulmayıb.

**Demonun ümumi quruluşu.** Demoda 9 ekran vəziyyəti var:

- `home` (ana səhifə);
- `catalog` (kataloq);
- `work` (əsər);
- `artist` (rəssam);
- `artists` (rəssamlar);
- `exhibitions` (sərgilər);
- `about` (haqqımızda);
- `collectors` (kolleksiyaçılar);
- `contact` (əlaqə).

Jurnal ekranı yoxdur: menyudakı "jurnal" sərgilər səhifəsini açır, orada "yeniliklər" siyahısı var. Sənəddə dörd əsas ekran ətraflı təsvir olunur: ana səhifə, kataloq, əsər səhifəsi və rəssam səhifəsi. Sərgilər və rəssamlar ekranları qısa qeyd olunur.

**Demonun tokenləri.** Kök elementdən oxunub:

| Token | Dəyər | Canlı saytdakı qarşılığı |
|---|---|---|
| `--page-pad` | `clamp(20px, 5vw, 72px)` | `--spacing-page: clamp(32px, 5vw, 96px)`. 1440-da ikisi də **72px** |
| `--sec-gap` | 120px | bloklar arası 96px (`gap-step-9`) və üstəlik 32px üst boşluq |
| səhifə fonu | #F4F0E8 | `surface` #F4F0E8, eynidir |
| mətn | #1A1614, zəif mətn #6B625C | `ink` və `ink-muted`, eynidir |
| tünd səth | #3E0B0A | `wine` #3E0B0A, eynidir |
| qırmızı | #F51000 | `signal` #F51000. Canlı saytda kiçik mətn üçün ayrıca `signal-ink` #DA0F02 var |
| incə xətt | #DDD6CA | `line` #DDD6CA, eynidir |
| güclü xətt | **#1A1614** (mətnin rəngi) | `line-strong` **#908A82** |
| başlıq şrifti | **Archivo Narrow** 600 | **Montserrat** 600 |
| mətn şrifti | Spectral | Spectral, eynidir |

---

## 1. Demonun dörd əsas ekranı

### 1.1. Ana səhifə (1440 enində 10 319px)

| # | Bölmə | Yeri (y) | Hündürlük | Fon | Nə var |
|---|---|---|---|---|---|
| 0 | Header, hero-nun üstündə şəffaf | 0 | 83 | şəffaf | fil sümüyü loqo 85×34 (72, 24); menyu kiçik hərflə; Instagram, Facebook; AZ / EN |
| 1 | **Hero** | 0 | **900** (100vh) | #1A1614 və foto | 2-ci bölmədə ətraflı |
| 2 | Statistika zolağı | 900 | 129 | səhifə | 4 sütun, aralarında incə xətt: "8 əsər", "4 rəssam", "2027 ilk satış sərgisi", "AZ · EN iki dildə" |
| 3 | Divar | 1029 | 900 | səhifə | "Divar" etiketi, h2 63px "Səkkiz əsər, həqiqi ölçüdə"; divar sola-sağa dartılır; altda "02 / 08", qırmızı irəliləmə xətti və "170 sm" |
| 4 | Sərgi "pərdəsi" | 1929 | 900 | **wine** | "Aprel 2027" etiketi; h2 **129,6px** fil sümüyü "İlk satış sərgisi"; mətn sağ sütunda Spectral ilə; qırmızı keçid "Sərgi haqqında →" |
| 5 | Kolleksiya | 2829 | **4099** | səhifə | solda sabit sütun (etiket, h2 63px üç sətir, mətn, qırmızı "Bütün əsərlər →"); sağda 6 əsər pilləli düzülüb (eni 76% / 40% / 28% / 54% / 32% / 62%); hər birinin küncündə ölçü nişanı, altında tam başlıq |
| 6 | Rəssamlar | 6927 | 975 | səhifə | h2 63px "Dörd rəssam, uzunmüddətli iş" və sağda "Bütün rəssamlar →"; **kənardan kənara 4 kafel, hər biri 359×684**, fonu rəssamın bir əsəri; altda qaranlıq keçid; "01", ad 28px, "1988 · Bakı"; küncdə "2 əsər" |
| 7 | Əsər necə alınır | 7903 | 531 | səhifə | h2 63px; aralarında şaquli xətt olan 4 sütun: etiket, nömrə, h3 28px, Spectral mətn |
| 8 | Yanaşma, FAQ, çağırış | 8434 | 1382 | səhifə | "Az sayda əsər, tam sənədləşdirmə" (3 sütun, h3 28px); "Əsər almaq mürəkkəb deyil" (solda mətn, sağda 3 bəndli akkordeon, "Ətraflı →"); "Əsərlə maraqlanırsınız?" h2 63px, mətn, iki düymə |
| 9 | Footer | 9815 | 504 | wine | 4 sütun: brend, şüar, ünvan və sosial keçidlər; naviqasiya (8 keçid); rəssamlar (4); əlaqə (ünvan, telefon, e-poçt, saatlar, WhatsApp); altda "© 2026 ArtNiyyətli · Qaydalar" |
| - | Sabit alt zolaq | ekranın altı | 52 | səhifə | "ArtNiyyətli · Bakı"; sağda "Zəng", "WhatsApp", "Müraciət". Bütün ekranlarda var |

Başlıqlar:

| Səviyyə | Ölçü / sətir hündürlüyü | Hərf aralığı | Rəng |
|---|---|---|---|
| h1 (hero) və sərgi pərdəsinin h2-si | 129,6 / 119px (9vw) | -4,5px (-0,035em) | fil sümüyü |
| bölmə h2-ləri | **63,4 / 64,6px** | -1,6px (-0,025em) | #1A1614 |
| h3 | 28 / 32px | -0,56px (-0,02em) | #1A1614 |
| etiket (h2-nin üstündə) | təxminən 11px Archivo Narrow | | #6B625C |

Bütün başlıqlar Archivo Narrow 600-dür.

### 1.2. Kataloq (3221px)

| Bölmə | Yeri | Hündürlük | Nə var |
|---|---|---|---|
| Səhifə başlığı zolağı | 83 | 263 | boşluqlar 40 / 72 / 48 / 72; "Kataloq" etiketi; h1 63px "Səkkiz əsər, hamısı ölçüsü ilə"; Spectral giriş cümləsi; **sağda böyük "8" və "əsər kataloqda"**; altda incə xətt |
| Gövdə | 346 | 2276 | üst boşluq 56; **yuxarıda üfüqi filtr cərgəsi**: 5 seçim siyahısı, sonra "8 əsər", sağda sıralama; altında əsərlər həqiqi ölçüdə, cərgələrdə, alt kənara düzülüb |

Kart başlığının sırası:

1. rəssam (Archivo);
2. *başlıq* (Spectral kursiv);
3. texnika · ölçü;
4. qiymət və nişan ("rezerv edilib" boz çərçivə, "satılıb" qırmızı çərçivə);
5. janr · kod.

### 1.3. Əsər səhifəsi (2319px)

- Yolu göstərən sətir: "əsərlər / Kamran Səfərli / Uzun divar".
- **İki sütun.**
  - **Solda:** şəkil 750×500. Üstündə tablar: foto / divarda gör / yaxınlaşdır / video. Altında 4 kiçik şəkil, hər biri 102×68, yazısı ilə (əsas, detal, çərçivə, divarda).
  - **Sağda (428px):**
    - rəssam; *başlıq, il* Spectral kursiv ilə, təxminən 26px;
    - texnika · ölçü; qiymət mətni;
    - qalın xətt; status "satışda";
    - tünd dolu düymə "bu əsər haqqında soruş" və çərçivəli düymə "WhatsApp ilə yaz";
    - təsvir; göstəricilər cədvəli (mənşə, sertifikat, çərçivə, çatdırılma, janr);
    - kod, qırmızı xətlə.
- Sorğu forması səhifədə açıq deyil, düymənin arxasındadır.
- "Oxşar əsərlər": üstündə 1px tünd xətt, h2 28px, əsərlər həqiqi ölçüdə.

### 1.4. Rəssam səhifəsi (2458px)

| Bölmə | Yeri | Hündürlük | Nə var |
|---|---|---|---|
| Rəssamlar arasında tablar | 123 | 42 | dörd adın hamısı, cari rəssamın altı xətli; altda incə xətt |
| Başlıq | 213 | 150 | ad h1 **88px** (-0,03em); "1979 · Gəncə · kətan üzərində abstraksiya"; **sağda 120×120 inisial kvadratı "KS"** (portret yoxdur) |
| Mətn | 411 | 231 | **iki sütun**: "bioqrafiya" və "yaradıcılıq yanaşması", Spectral |
| Sərgilər və mükafatlar | 706 | 409 | üstdə 1px tünd xətt; h2 28px; sətirlərdə il, ad (Archivo 20px) və yer (Spectral); "mükafat" nişanı |
| Bütün əsərləri | 1211 | 647 | h2 28px; əsərlər həqiqi ölçüdə, alt kənara düzülüb |

### 1.5. Qısa: sərgilər və rəssamlar ekranları

- **Sərgilər (2313px):**
  - kataloqdakı kimi səhifə başlığı zolağı (h1 63px, sağda "Aprel 2027 · növbəti sərgi");
  - sonra aktual sərgi **wine rəngli kart** kimi: etiket, h2 56px, tarix və yer, mətn, qırmızı keçid;
  - sonra "keçmiş sərgilər" (il, ad, yer, "keçmiş" nişanı) və "yeniliklər" (tarix, başlıq, mətn).
- **Rəssamlar (1561px):** başlıq zolağı, sonra ana səhifədəki 4 kafel (359×684).

---

## 2. Hero ətraflı

Demonun ana səhifəsi **tam ekran, bir sütunlu** hero ilə açılır.

| Element | Yeri (x, y) | Ölçü | Qeyd |
|---|---|---|---|
| Fon şəkli | 0, 0 | **1440×900**, `object-fit: cover` | `hero-qalereya.png` (1536×1024): qaranlıq qalereya zalı, divarda üç böyük tablo. Üstündə tünd örtük var, mətn oxunur |
| Header | 0, 0 | 83px | şəffaf, fil sümüyü loqo, açıq mətnli menyu |
| Etiket | 72, 362 | təxminən 11px | "Bakı · müstəqil qalereya" |
| Başlıq h1 | 72, 388 | **129,6px**, Archivo Narrow 600, -0,035em, iki sətir | "Əsər divarda / başlayır." fil sümüyü rəngində |
| Giriş cümləsi | 72, 650 | Spectral, təxminən 19px, iki sətir | "ArtNiyyətli seçilmiş rəssamları təmsil edir və hər əsəri divarınızın həqiqi ölçüsündə göstərir." |
| Düymələr | 72, 738 | hündürlük 54px | "Əsərlərə bax" (fil sümüyü dolu), "Rəssamları kəşf et" və "Əsər almaq üçün əlaqə saxla" (çərçivəli) |
| Küncdəki qeyd | sağ alt, y 782 | kiçik | "İlk satış sərgisi · aprel 2027" |

Mətn bloku ekranın aşağı yarısına bərkidilib: 362-dən 792-yə qədər, yəni 430px.

**Hero ilə divar arasında** statistika zolağı var (129px, 4 rəqəm, aralarında incə xətt). Divar bölməsi 1029-cu pikseldən başlayır. Divarın başlığı 1090-da, əsərlər təxminən 1240-da görünür.

**Ümumi hündürlük:** hero 900 və zolaq 129, cəmi **1029px**. 1440×900 ekranda ilk ekran bütünlüklə hero-dur. **Divar ilk ekranda görünmür.**

**Canlı saytda:**

- hero 122-ci pikseldə başlayan 107px-lik mətn blokudur: h1 59px Montserrat və bir abzas, ikisi də admin paneldən gəlir;
- divar **301-ci pikseldən** başlayır;
- şəkil, düymə və statistika yoxdur.

Bu, 6-cı mərhələdə verilmiş qərarın nəticəsidir: "divar ilk ekranda olmalıdır".

---

## 3. Demonun şəkilləri

Paketdə 8 JPEG əsər şəkli, 1 PNG hero şəkli və 2 PNG loqo var.

| Fayl | Ölçü | Nisbət | Ölçü (bayt) | Məzmun |
|---|---|---|---|---|
| 01-uzun-divar.jpg | 1536×1024 | 3:2 | 371 KB | üfüqi iki sahə: yuxarıda açıq boz-ağ, aşağıda tünd qırmızı-qəhvəyi; kətan faktura |
| 02-sessiz-otaq.jpg | 1536×1024 | 3:2 | 380 KB | boz-yaşıl fonda ortada daha tünd kvadrat; kətan faktura |
| 03-kagiz-iki-qat.jpg | 1024×1536 | 2:3 | 378 KB | cırılmış kağız kollajı: oxra, boz, bordo; qələmlə şaquli xətt |
| 04-gece-sahesi.jpg | 1536×1024 | 3:2 | 380 KB | qalın faktura, qara-qəhvəyi, sol altda pas-narıncı |
| 05-duz-ve-kul.jpg | 1254×1254 | 1:1 | 494 KB | çatlamış səthdə konsentrik dairələr: bordo, boz, oxra |
| 06-tuncun-yaddasi.jpg | 1024×1536 | 2:3 | 425 KB | şaquli pas-qırmızı zolaq, axan boya izləri |
| 07-divar-qeydi.jpg | 1024×1536 | 2:3 | 378 KB | kağız üzərində üç qəhvəyi-qara fırça zərbəsi, damcılar |
| 08-qirmizi-xett.jpg | 1254×1254 | 1:1 | 323 KB | boz, qəhvəyi, bordo düzbucaqlılar, üstündən nazik qırmızı maili xətt |
| hero-qalereya.png | 1536×1024 | 3:2 | 2,06 MB | qalereya zalı, divarda üç tablo |
| logo-horizontal(-ivory).png | 1000×402 | 2,49:1 | təxminən 44 KB | loqo, 5-ci bölməyə bax |

**Cavab.** Bunlar əsl tablo fotosu deyil, rəngli sahə də deyil: **süni intellektlə yaradılmış şəkillərdir.** Dəlillər:

1. **Hero şəkli** C2PA (Content Credentials) imzası daşıyır, imzalayan **OpenAI**-dır. `softwareAgent: gpt-image`, `digitalSourceType: trainedAlgorithmicMedia` (IPTC-nin "süni intellektlə yaradılıb" kodu), `c2pa.created` tarixi 2026-09-09-dur. Bu, şəklin OpenAI modeli ilə yaradıldığının kriptoqrafik qeydidir.
2. **8 əsər şəklinin və 2 loqonun** hər birində C2PA qeydi var. Bu qeyd Anthropic tərəfindəndir: "Claude provided this file at the request of a user and may have created or modified the file contents", hərəkət `c2pa.opened`. Mənşənin etibarlılığı `unknown` kimi qeyd olunub. Kamera EXIF-i (model, obyektiv, ekspozisiya) heç birində yoxdur.
3. **Görünüşü də buna uyğundur:**
   - səkkizinin hamısında eyni sintetik kətan faktura var;
   - imza, kətanın kənarı, çərçivə, işıq əksi yoxdur;
   - adları demonun uydurma əsər adlarıdır ("Uzun divar", "Səssiz otaq" və s.).

**Tanınan əsərdirmi?** Mənim baxışıma görə heç biri konkret, tanınan bir əsərin surəti deyil. 01 və 02 ümumən "rəng sahəsi" rəssamlığını xatırladır, 05 isə dekorativ dairə motividir, amma hər ikisi konkret bir tabloya uyğun gəlmir. Bunu yüz faiz təsdiq edə bilmərəm. Şəkilləri kənar axtarış xidmətinə mən yükləmədim.

**Müştəri demonu göstərməzdən əvvəl tövsiyəm:**

- **Tərs axtarış edin.** 8 şəkli və hero-nu Google Lens və ya TinEye ilə yoxlayın. Hər biri üçün 5 dəqiqəlik işdir.
- **Müəllif hüququ riski azdır, amma təqdimat riski var.** Şəkillər internetdən götürülməyib, yaradılıb, ona görə üçüncü şəxsin əsərinin qanunsuz istifadəsi ehtimalı aşağıdır. Lakin demo onları adı çəkilən rəssamların qiyməti yazılmış əsərləri kimi göstərir (məs. "Kamran Səfərli, Uzun divar, qiymət sorğu ilə"). Qalereya üçün bu, süni intellektin yaratdığı işi əsl əsər kimi təqdim etmək deməkdir. Demonu kənar adama göstərəndə ya **"şəkillər illüstrativdir, süni intellektlə yaradılıb"** qeydi olsun, ya da şəkillər qalereyanın əsl əsərlərinin fotoları ilə əvəz olunsun.
- **Rəssam adları uydurmadır** (Nərmin Qasımova, Kamran Səfərli, Aysel Mehdiyeva, Elçin Babayev), amma adi Azərbaycan adlarıdır. Real rəssamla adaşlıq mümkündür. Demonu ictimai göstərməzdən əvvəl bunu da yoxlamaq lazımdır.
- **Lokal demo verilənləri:** canlı saytın lokal bazasına yüklənmiş demo əsərlər eyni adları və, ehtimal ki, eyni şəkilləri işlədir. İstehsala keçməzdən əvvəl onlar silinməlidir.

---

## 4. Fərqlər

Hər sətirdə: demoda necədir, canlı saytda necədir, hansı daha yaxşıdır və nə qədər işdir. İş həcmi üç dərəcədədir:

- **kiçik:** yarım günədək;
- **orta:** 1-2 gün;
- **böyük:** 3 gün və çox.

### A. Böyük fərqlər

| # | Mövzu | Demo | Canlı sayt | Hansı daha yaxşıdır | İş |
|---|---|---|---|---|---|
| A1 | Hero | Tam ekran foto, 900px; h1 130px; 3 düymə; sonra statistika zolağı. Divar 1029-dan başlayır | Mətn bloku 107px, divar 301-dən başlayır | **Canlı sayt, amma hero zəifdir.** Demonun hero-su əsas ideyanı (həqiqi ölçü) ilk ekrandan çıxarır və süni intellektin yaratdığı zal şəklinə söykənir. Canlı saytda isə ilk sözlər çox sadədir: brendin adı və bir abzas. Aralıq yol: böyük başlıq, 1-2 düymə, divar yenə ilk ekranda | orta |
| A2 | Ana səhifədə cari sərgi | Kənardan kənara wine pərdə, 900px; başlıq 130px, mətn sağda | İncə xətlər arasında sadə sətirlər (ad, tarix, yer, status) | **Demo.** Brend rəngi ilə güclü, yadda qalan blokdur, məlumatı API-dən gəlir (`homepage.exhibitions.current`). Hündürlüyü 900 yox, məzmuna görə olmalıdır | orta |
| A3 | Kolleksiya (seçilmiş əsərlər) | Pilləli düzüm, 4099px, eni əl ilə verilmiş faizlər | Bir k ilə həqiqi ölçülü şəbəkə, 1135px | **Canlı sayt.** Demonun faizləri həqiqi ölçünü pozur: 40 sm-lik "Qırmızı xətt" 28% alır, 180 sm-lik "Uzun divar" 76%. Nisbət 0,37 çıxır, 0,22 olmalıdır. Solda sabit giriş sütunu ideyasını götürmək olar | kiçik (yalnız sütun) |
| A4 | Ana səhifədə rəssamlar | Kənardan kənara 4 kafel, 359×684, fonu əsər şəkli, ad üstdə | Kiçik mətn siyahısı (portret varsa 64px), 136px | **Demo daha güclüdür, amma olduğu kimi yox.** Rəssamı başqasının deyil, öz əsəri ilə göstərmək yaxşıdır. API-də `homepage.artists` əsər qaytarmır, ona görə portret ilə 4:5 kafel (7-ci mərhələnin `ArtistPortrait`-i) və adın altda olması uyğundur. Mətni şəkil üstünə qoymaq kontrast riskidir | orta |
| A5 | "Necə alınır", yanaşma, FAQ, çağırış | 4 ayrıca bölmə: 4 sütunlu addımlar, 3 sütunlu yanaşma, akkordeon, iki düyməli çağırış | "steps" bölməsi tək başlıq və mətndir; FAQ məlumat varsa; əlaqə bloku | **Demo**, amma məzmun admin paneldən gəlməlidir. API-də bölmə yalnız `heading` və `body`-dir, 4 addım üçün quruluş yoxdur. Ya backend bölməni elementli edir, ya da ön tərəf `body`-ni sətirlərə bölür (kövrək) | backend-dən asılı |
| A6 | Daxili səhifələrin başlığı | Zolaq: etiket, h1 63px, giriş cümləsi, sağda böyük rəqəm (8 əsər, Aprel 2027); boşluqlar 40 / 48; altda xətt | Yalnız h1 59px və altında xətt | **Demo.** Ucuzdur, hər siyahı səhifəsinə kontekst verir. Rəqəm də API-dən gəlir: `meta.total`, cari sərginin tarixi | kiçik |
| A7 | Əsər səhifəsinin kompozisiyası | İki sütun: şəkil tabları (foto / divarda gör / yaxınlaşdır / video) solda, bütün hərəkətlər sağda; forma düymənin arxasında; 2319px | Şəkil və məlumat, sonra "Divarda gör" ayrıca bölmə, sonra açıq forma; 3579px | **Qarışıq.** "Divarda gör"ün ayrıca bölmə olması canlı saytda daha yaxşıdır: divar geniş olur, 5-ci mərhələdə buna görə seçilmişdi. Formanın açıq olması da yaxşıdır, hər mərhələdə bir klik azdır. Demodan göstəricilər cədvəlinin sağ sütunda yığcamlığını götürmək olar | kiçik-orta |
| A8 | Rəssam səhifəsinin başlığı | Ad **88px**; bioqrafiya və yanaşma iki sütunda; bütün rəssamlar arasında tablar | Portret 160px, ad 28px; mətnlər alt-alta | **Demo** ad ölçüsündə və iki sütunda. Tablar 4 rəssamda işləyir, 20 rəssamda sınar, **canlı sayt** | kiçik |
| A9 | Sabit alt zolaq | Hər ekranın altında 52px: Zəng / WhatsApp / Müraciət | Yoxdur | **Masaüstündə canlı sayt:** demonun görüntülərində zolaq məzmunun üstünə düşür, divar və cədvəl sətirlərini örtür. **Mobildə demo** faydalı ola bilər, 9-cu mərhələdə baxılsın | kiçik |
| A10 | Footer | 4 sütun (brend və ünvan, naviqasiya, rəssamlar, əlaqə), 504px | Brend və 4 hüquqi keçid, 216px | **Demo.** Əlaqə məlumatı hər səhifədə olmalıdır, `site-settings`-dən gəlir, əlavə sorğu yoxdur | kiçik-orta |

### B. Orta fərqlər

| # | Mövzu | Demo | Canlı sayt | Qiymət | İş |
|---|---|---|---|---|---|
| B1 | **Başlıq iyerarxiyası** | Ana səhifədə h1 130px, bölmə h2-ləri 63px, h3 28px, daxili h1 63px, rəssamın adı 88px | Ana səhifədə h1 59px, bölmə h2-ləri **28px**, daxili h1 59px, rəssamın adı 28px | **Demo.** Canlı saytda ana səhifənin bölmə başlıqları mətndən çox az seçilir. Tokenlər hazırdır (`text-display`, `text-hero`), yalnız sinif dəyişikliyidir | kiçik |
| B2 | **Başlıq şrifti** | Archivo Narrow 600, dar qrotesk. Demonun öz qeydinə görə "loqonun qroteskini əvəz edir" | Montserrat 600, geniş həndəsi şrift | **Açıq sual.** Şrift birinci mərhələdə seçilib. Başlıqlar böyüdülsə (B1) fərq kəskinləşir: Montserrat ilə 120px "Əsər divarda başlayır." bir sətrə sığmır, Archivo Narrow ilə sığır. Qərar sizindir, 5-ci bölməyə bax | kiçik (texniki), amma hər səhifəyə təsir edir |
| B3 | Etiketlər | Hər h2-nin üstündə kiçik boz etiket: "Divar", "Kolleksiya", "Təmsilçilik", "Alış" | Yoxdur | **Demo**, ritmi yaxşılaşdırır. Kiçik hərfli, böyük hərf qadağasına uyğundur | kiçik |
| B4 | Bölmələr arası ritm | Hər bölmənin üstündə 120px boşluq; bölmələri xətt yox, fon dəyişikliyi ayırır | 96px ara, 32px üst boşluq, hər blokun üstündə xətt | Cəmi hündürlük təxminən eynidir (120 və 128). **Demo** fon dəyişikliyi ilə daha sakitdir, canlı saytda xətt çoxdur | kiçik |
| B5 | Header | 83px; menyu Archivo Narrow 15px, kiçik hərflə; sosial keçidlər header-dədir | 74px; menyu Montserrat 14px, böyük hərflə başlayır; sosial keçidlər footer-dədir | Bərabərdir. Sosial keçidlərin footer-də olması daha təmizdir | kiçik |
| B6 | Divarın təqdimatı | 3,12 px/sm (ekranda 2 əsər); fon səthi və döşəmə xətti yoxdur; "170 sm" yazısı fiqurun başının üstündədir; qırmızı irəliləmə xətti | k = 1,70 (ekranda 4-5 əsər); fon, kənar xətlər, miqyas xətti, "1 / 5" | **Canlı sayt.** 6-7-ci mərhələlərdə demonun hesablama səhvləri düzəldildi. Qırmızı xətt Signal limitini yeyir | yoxdur |
| B7 | Düymələr | Əsas düymə tünd #1A1614 ilə dolu, hero-da fil sümüyü ilə dolu, ikincilər çərçivəli | Yeganə dolu düymə wine rəngdədir | **Canlı sayt:** wine brend rəngidir, bir dolu düymə qaydası aydındır. Demodan çərçivəli ikinci düyməni götürmək olar | kiçik |
| B8 | Keçidlər | Mətn keçidləri qırmızı, altı xətli, "→" ilə | Ink rəngli, altı xətli, oxsuz | **Canlı sayt.** Demoda bir ekranda 4-6 qırmızı element olur (loqo, aktiv menyu, 2-3 keçid, irəliləmə xətti), Signal limiti (3) pozulur. "→" işarəsi isə götürülə bilər | kiçik |
| B9 | Güclü xətt | Mətnin rəngi #1A1614: bölmələrin üstündə qalın, tünd xətt | #908A82, daha yumşaq | **Qarışıq.** Demonun tünd xətti "Oxşar əsərlər", "sərgilər və mükafatlar" kimi bölmələri redaksiya üslubunda kəsir. Canlı saytda yalnız bölmə başlıqlarının üstündə 1px ink xətt sınana bilər | kiçik |
| B10 | Kataloq filtrləri | Yuxarıda üfüqi cərgə: 5 seçim və sıralama | Solda sütun, açılıb-bağlanır, ölçü və qiymət aralığı da var | **Canlı sayt.** Filtr çoxdur, üfüqi cərgəyə sığmır | yoxdur |

### C. Kiçik fərqlər

| # | Mövzu | Demo | Canlı sayt | Qiymət |
|---|---|---|---|---|
| C1 | Hərf aralığı, displey başlıqlar | -0,035em (130px), -0,025em (63px), -0,02em (28px) | `hero` -0,045em, `display` -0,035em, `heading` -0,03em | Montserrat daha genişdir, canlı saytın sıx aralığı buna görə doğrudur. Şrift dəyişsə demonun dəyərlərinə qayıtmaq lazımdır |
| C2 | Hərf ölçüsü | Menyu və daxili h2-lər kiçik hərflə ("sərgilər və mükafatlar", "bütün əsərləri") | Cümlə kimi ("Sərgi tarixçəsi") | Zövq məsələsidir. Kiçik hərf demonun xarakteridir, amma başlıqlar admin paneldən gələndə tutarlı olmur. Canlı sayt |
| C3 | Səhifə kənarları | `clamp(20px, 5vw, 72px)` | `clamp(32px, 5vw, 96px)`, 1024-dən aşağı 32px, 760-dan aşağı 20px | 1440-da eynidir (72px). 1920-də canlı sayt 96px verir, demo 72px. Fərq yalnız çox geniş ekranda görünür |
| C4 | Rənglər | Eyni palitra | Eyni palitra, üstəlik `signal-ink` #DA0F02 | Canlı sayt: kiçik qırmızı mətn kontrastı üçün |
| C5 | Kart başlığı | rəssam, *başlıq*, texnika · ölçü, qiymət, janr · kod | başlıq, rəssam, ölçü, qiymət | Demoda kod və janr da var, kolleksiyaçı üçün faydalıdır, amma kart ağırlaşır. Canlı sayt |
| C6 | Rəssam portreti | 120px inisial kvadratı ("KS") | 4:5 rəngli sahə, portret varsa şəkil | Canlı sayt: inisial kvadratı yer tutan kimi görünür |

### Səkkizinci mərhələdən qalan iki qeyd

**1. Sərgi səhifəsində başlıq ilə mətn arasındakı boşluq.**

Demoda ayrıca sərgi səhifəsi yoxdur. Ən yaxın qarşılıqlar:

- **Sərgilər ekranındakı wine kart:** etiket → h2 təxminən 16px, h2 → tarix 16px, tarix → mətn 24px.
- **Ana səhifədəki sərgi pərdəsi:** etiket başlığa yapışıqdır, mətn ayrıca sütundadır.
- **Daxili səhifələrin başlıq zolağı:** h1 → giriş cümləsi təxminən 24px.

Yəni demoda başlıq, məlumat sətri və mətn **bir blokdur, 16-24px** ara ilə. 96px (təxminən 120px) yalnız **bölmələr arasındadır**.

Canlı saytda başlıq (h1 və tarix sətri) ilə mətn arasında `gap-step-9` = **96px** var, çünki mətn ayrıca bölmə kimi qurulub. Düzəliş: başlıq və mətn bir `header` blokuna, aralarında 24-32px (`step-5` / `step-6`); 96px yalnız divar, rəssamlar və media bölmələri arasında qalsın. İş kiçikdir.

**2. Qısa səhifələrdə footer.**

Demoda kök elementə `min-height: 100vh` verilib (və sabit zolaq üçün `padding-bottom: 52px`). Footer həmişə ekranın altındadır.

Canlı saytda da eyni qayda var: `SiteShell` = `min-h-screen flex-col`, `main` = `flex-1`. Yoxlanıldı: məxfilik səhifəsində 1440×900 ekranda footer 684-900 arasındadır, yəni ekranın **altına bərkidilib**.

8-ci mərhələnin hesabatında yazdığım "footer yuxarı qalxır" **dəqiq deyildi**. Footer qalxmır. Görünən, qısa məzmunla footer arasındakı təxminən 390px boşluqdur. Demo da eyni boşluğu verərdi. Düzəliş lazım deyil. Hüquqi səhifələrə əsl mətn gələndə boşluq özü itəcək.

---

## 5. Loqo

**Kodda:**

- Brend nişanı bir komponentdədir: `resources/js/public/components/BrandMark.jsx`.
- İki yerdə işlənir: `layout/Header.jsx` (ana səhifəyə keçid) və `layout/Footer.jsx`.
- Rejimlər (`logo_display_mode`):

| Rejim | `logo_url` varsa | `logo_url` yoxdursa |
|---|---|---|
| `logo_text` (standart) | loqo və mətn | yalnız mətn |
| `logo_only` | yalnız loqo, `alt` = brend mətni | yalnız mətn (heç vaxt boş qalmır) |
| `text_only` | yalnız mətn | yalnız mətn |

- Ölçü: şəkil `h-8` (32px hündürlük), mətn `text-subheading font-bold`. Header və footer bu sinifləri ötürə bilər.

**API-də:**

- `GET /site-settings` qaytarır: `logo_url` (thumbnail variantı, **ən uzun tərəfi ≤ 300px**, webp, yoxdursa jpeg, yoxdursa `null`), `logo_display_mode`, `brand_text`.
- `logo_media_id`-dən istifadə edilməməlidir.
- Lokal bazada `logo_url` `null`-dur, ona görə indi hər yerdə mətn görünür.
- **Loqo üçün yalnız bir sahə var.** İkinci rəng variantı (açıq fon və tünd fon) üçün sahə yoxdur.

**Demoda:**

- İki PNG var, hər biri **1000×402** (2,49:1):
  - `logo-horizontal.png`: **qırmızı** (Signal), açıq fonlarda;
  - `logo-horizontal-ivory.png`: fil sümüyü, hero üstündə və footer-də.
- Header-də **85×34** (x 72, y 24), footer-də **75×30**.
- Forma: "A" monoqramı (içində göz forması) və iki sətirdə "Art / Niyyätli".
- **Diqqət:** loqoda ad **"Niyyätli"** yazılıb, "ä" hərfi ilə. Brendin adı isə hər yerdə "ə" ilədir. Loqo fayllarında da C2PA qeydi var ("Claude provided this file..."), yəni onlar da demo üçün yaradılıb və müştərinin rəsmi loqosu olmaya bilər. **Müştəridən rəsmi loqo faylını (ideal halda SVG) istəmək lazımdır.**

**Rəng qərarına görə qeydlər** (açıq fonda `wine`, bordo fonda `wine-ink`; tətbiq olunmayıb):

- Demodakı açıq fon loqosu qırmızıdır, qərar isə wine-dır. Demonun faylı birbaşa işlənə bilməz, **wine rəngli fayl** lazımdır.
- API tək `logo_url` qaytarır, footer isə wine fonundadır. Bir rastr faylla iki rəngi CSS ilə vermək olmur (`filter` hiylələri etibarsızdır). Seçimlər:
  1. backend-ə ikinci sahə əlavə olunur, məs. `logo_on_dark_url` (S11 kimi);
  2. loqo ön tərəfdə SVG kimi saxlanılır və `currentColor` ilə rənglənir (admin paneldən dəyişməz olur);
  3. footer-də yalnız mətn qalır.

  Tövsiyəm birinci seçimdir.

  **Qərar (tətbiq mərhələsi):** ikinci seçim götürüldü. Brend kitabçasından çıxarılmış iki SVG (`brand/artniyyetli-lockup.svg`, `brand/artniyyetli-mark.svg`, `fill="currentColor"`) `BrandLogo` komponentində inline çəkilir. API-nin `logo_url` sahəsi işlənmir, S11 siyahıdan çıxarıldı.
- 300px-lik thumbnail 34px hündürlükdə 2x ekran üçün kifayətdir: 34 × 2 = 68px hündürlük lazımdır, 300px-lik faylda 120px var.

---

## 6. Tövsiyə

### Tətbiq etməyi məsləhət görürəm (təsirə görə sıralanıb)

1. **B1: başlıq iyerarxiyası.**
   - Ana səhifənin bölmə h2-ləri `text-display`-ə (59-64px) keçsin.
   - Rəssamın adı `text-display` olsun.
   - Hero h1-i böyüsün.

   Ən ucuz və ən görünən dəyişiklikdir. Canlı sayt indi demodan ən çox burada zəif görünür.
2. **B2: şrift qərarı**, B1 ilə birlikdə.
   - Başlıqlar böyüyəndə Montserrat-ın eni problem olacaq.
   - Tövsiyəm: Archivo Narrow-u bir gün sınaq şaxəsində başlıq şrifti kimi yoxlamaq (mətn Spectral qalır). Qərarı ekran görüntüləri ilə verin.
   - Sonra C1-dəki hərf aralıqlarını buna uyğunlaşdırmaq.
3. **A6 və B3: daxili səhifələrin başlıq zolağı və etiketlər.** Kataloq, rəssamlar, sərgilər və jurnal üçün etiket, h1, giriş cümləsi və sağda rəqəm. Giriş cümləsi üçün mətn mənbəyi lazımdır: ya lüğət, ya CMS səhifəsi.
4. **A2: cari sərgi wine pərdəsi ana səhifədə.** Hündürlük məzmuna görə, başlıq `text-hero` ilə, keçid ink rəngində (qırmızı yox).
5. **A1: hero.**
   - Tam ekran foto **yox**.
   - Başlıq `text-hero`-ya yaxın, amma divar ilk ekranda qalsın: 1440×900-də divar təxminən 480-ci pikseldən başlamalıdır.
   - Başlıq bir sətir, giriş cümləsi, iki düymə: "Əsərlərə bax" wine rəngdə dolu, "Rəssamlar" çərçivəli.
   - Statistika zolağı lazım deyil: rəqəmlər (8 əsər, 4 rəssam) kiçik qalereyada zəiflik kimi oxunur.
   - Admin hero bölməsinə əsl qalereya fotosu (`image_url`) yükləsə, onu sonra fon kimi düşünmək olar.
6. **A10: 4 sütunlu footer.** Əlaqə məlumatı `site-settings`-dən, naviqasiya `navigation`-dan gəlir. Rəssamlar sütunu əlavə sorğu tələb edir, lazım deyil.
7. **A4: ana səhifədə rəssamlar** 4:5 portret kafelləri ilə, ad altda.
8. **A8: rəssam səhifəsində** bioqrafiya və yanaşma iki sütunda.
9. **8-ci mərhələnin qeydi:** sərgi səhifəsində başlıq ilə mətn bir blok olsun.

1-9-un hamısı birlikdə təxminən 4-6 iş günüdür. 1 və 3 bir gündür.

### Tətbiq etməməyi məsləhət görürəm

- **Tam ekran foto hero.** Divarı ilk ekrandan çıxarır; şəkil süni intellektlə yaradılıb.
- **Kolleksiyanın pilləli düzümü (A3).** Həqiqi ölçünü pozur, 4099px uzunluq alır.
- **Demonun divar hesablaması və qırmızı irəliləmə xətti (B6, B8).** Canlı saytdakı daha doğrudur, Signal limitini qoruyur.
- **Qırmızı mətn keçidləri (B8)** və **demonun əsər səhifəsinin kompozisiyası (A7)**, cədvəlin yığcamlığı istisna olmaqla.
- **Sabit alt zolaq masaüstündə (A9).** Mobil üçün 9-cu mərhələdə baxılsın.
- **Rəssam tabları (A8), inisial kvadratı (C6), kiçik hərfli başlıqlar (C2).**

### Backend-dən asılı olanlar

| # | Nə lazımdır | Səbəb |
|---|---|---|
| S9 | rəssamın əsər sayı (artıq siyahıdadır) | kartlarda "2 əsər" |
| S10 | E10-da iştirakçı rəssamların `portrait_url`-i | sərgi səhifəsində portretlər |
| S12 (təklif) | ana səhifənin "steps" bölməsi üçün elementli quruluş | A5-in 4 sütunlu addımları |

### Müştəriyə suallar

1. **Rəsmi loqo faylı.** SVG, "ə" ilə düzgün yazılışda. Demodakı loqo "Niyyätli" yazılışındadır və süni intellekt qeydi daşıyır.
2. **Demo şəkilləri.** Göstərilməzdən əvvəl tərs axtarış və "illüstrativdir" qeydi, ya da əsl əsərlərin fotoları.
3. **Başlıq şrifti:** Montserrat qalır, yoxsa Archivo Narrow sınanır.
