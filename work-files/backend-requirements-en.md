# ArtNiyyətli: Backend Requirements

This document describes how the backend of the approved design prototype must work. No code, only requirements. Everything visible in the demo must be powered by the tasks listed here.

**What the project is:** a commercial art gallery. It represents artists, presents artworks and sells them. In phase one there is no online payment; the buyer sends an enquiry.

**Core principle:** every text, image and price on the site must be editable from the admin panel. The gallery owner must be able to add a new artist, artwork or exhibition without contacting a developer.

---

## 1. Data structure

The main objects stored in the system and their fields.

### 1.1 Artist

- First and last name
- Slug (used in the URL, e.g. `nermin-qasimova`)
- Year of birth
- Place of birth
- Direction (one line, e.g. "abstraction on canvas")
- Biography (long text)
- Artistic approach (long text)
- Portrait image (optional, not used now, may be added later)
- Representation image (the artwork image used as the accordion background)
- Exhibition records (repeatable list: year, exhibition title, venue)
- Awards and residencies (repeatable list: year, title)
- Sort order (position on the site)
- Active / hidden status

### 1.2 Artwork

- Title
- Slug
- Artist (relation to artist)
- Year created
- Medium (selected from a managed list, see below)
- Genre (selected from a managed list)
- Width in centimetres (number)
- Height in centimetres (number)
- Price (number, AZN)
- Show price yes/no. When no, the site displays "Price on request"
- Availability: available / sold / reserved
- Year sold (if sold)
- Inventory code (e.g. AN-2025-014, must be unique)
- Main image
- Additional images (repeatable list, 3 to 5: detail, frame, view on wall)
- Short description (one or two sentences)
- Provenance (text)
- Certificate yes/no
- Frame condition (text)
- Delivery note (text)
- Featured (show on the homepage)
- Show on wall (include in the homepage opening wall)
- Sort order
- Active / hidden status

**Important:** width and height are the core of the site. Artworks are displayed at relative scale based on these numbers. Both fields are mandatory and cannot be left empty.

**Important 2:** the aspect ratio of the uploaded image must match the ratio of the entered cm dimensions. The system should check this on upload and warn if the difference exceeds 5 percent.

### 1.3 Exhibition and news

- Title
- Slug
- Type: exhibition / news / announcement
- Status: current / past / upcoming
- Start date
- End date
- Venue
- Short text
- Full text
- Image (optional)
- Participating artists (relation, multiple)
- Exhibited artworks (relation, multiple)
- Active / hidden status

### 1.4 Page content

All fixed text on the site that may change. None of it should be hard-coded.

- Hero slogan and supporting text
- Hero image
- Section labels and headings (for every section)
- All text on the About page
- All text on the For Collectors page
- The four-step process text
- Frequently asked questions (repeatable list: question, answer)
- Contact details: address, phone, email, opening hours
- Social media links
- Footer text

### 1.5 Managed lists

These must be editable, not hard-coded:

- Media (oil on canvas, mixed media on paper, acrylic on canvas, oil on board, ink on paper, plus any added later)
- Genres (abstraction, figurative, works on paper, and so on)
- Price ranges used by the filter (under 1,000; 1,000-5,000; 5,000-10,000; above 10,000)

### 1.6 Enquiries

Every form submission must be stored in the database.

- Date and time
- Name
- Contact (email or phone)
- Subject (buy an artwork / artist submission / other)
- Message
- Related artwork (relation, if submitted from an artwork page)
- Inventory code (filled automatically)
- Status: new / read / replied / closed
- Internal note (for gallery staff)

---

## 2. Public site requirements

### 2.1 Homepage

- Hero: image, slogan and text come from the admin panel
- Statistics strip: artwork count and artist count calculated automatically, never typed manually
- Wall: only artworks flagged "show on wall", in sort order
- Featured works: only artworks flagged "featured", six items
- Artist accordion: active artists, in sort order
- Exhibition section: the exhibition with status "current". If none exists, the nearest upcoming one

### 2.2 Catalogue (Works page)

- All active artworks
- Five filters: artist, genre, medium, price range, availability
- Filters must combine (artist plus genre selected at the same time)
- Selected filters stored in the URL so the link can be shared and survives a page refresh
- Result count updates live
- When nothing matches, show a message and a reset button
- Sorting: newest first (default), price ascending, price descending, by size
- Pagination above 24 works

### 2.3 Artwork detail page

- All information from the database
- "View on wall" feature: renders the artwork against a wall using its cm dimensions. Wall height selector: 2.4 / 2.7 / 3.2 metres
- Inventory code can be copied to clipboard
- Enquiry form: artwork title and inventory code filled in automatically
- WhatsApp button: opens with a prepared message including the title and code
- Other works by the same artist below

### 2.4 Artist profile

- All information from the database
- All active works by that artist
- Exhibition and award lists

### 2.5 Other pages

About, Exhibitions and News, For Collectors, Contact. All text comes from the admin panel.

---

## 3. Admin panel

The gallery owner will use this. No technical knowledge should be required.

### 3.1 General

- Panel interface in Azerbaijani
- Login with username and password
- Two roles: administrator (full access) and editor (content only, no user management)
- Must work on a mobile phone

### 3.2 Artwork entry form

This is the most frequently used screen and deserves particular attention.

- All fields on one screen, grouped into sections
- Drag and drop image upload
- Multiple images can be uploaded at once
- Image order can be changed by dragging
- Inventory code suggested automatically (AN-year-sequence), but editable
- When dimensions are entered, the system checks the image ratio and warns on mismatch
- Preview showing how the entry will look on the site before saving

### 3.3 Ordering

Artists, artworks and exhibitions must be reorderable by dragging.

### 3.4 Enquiries section

- List of incoming enquiries, newest first
- Unread ones visually distinct
- Status can be changed
- Internal notes can be added
- One click through to the related artwork

### 3.5 Page content section

All fixed site text collected in one place, grouped by page.

---

## 4. Forms and notifications

- Every form on the site writes to the database
- Each new enquiry is emailed to the gallery
- The email contains: name, contact, message, artwork title and inventory code
- Spam protection: hidden honeypot field or a simple check. No captcha codes that inconvenience the user
- A confirmation message is shown after submission
- No more than five submissions per hour from one IP address

---

## 5. Multilingual structure

In phase one the site is Azerbaijani only, but the structure must be built ready for a second language.

- Every text field stored per language (separate fields for Azerbaijani and English)
- If the English value is empty, the site falls back to Azerbaijani
- URL structure: `artniyyetli.az/az/eserler` and `artniyyetli.az/en/works`
- A language toggle next to every text field in the admin panel

This cannot be retrofitted. If it is not built now, the entire database will have to be rewritten later.

---

## 6. Images

- Every uploaded image is automatically stored in several sizes: thumbnail, catalogue, detail, full
- A modern format (WebP or AVIF) is generated, with JPEG kept as a fallback
- The aspect ratio is stored in the database so pages do not shift while loading
- Alt text can be entered for every image
- Maximum upload size 10 MB, the system compresses it
- Images served through a CDN

Image weight is the main technical risk on this project. Artwork photographs are large and the site will not open on mobile data if they are not optimised.

---

## 7. SEO and sharing

- Title and description editable per page from the admin panel
- If left empty, generated automatically (for an artwork: title, artist, medium, dimensions)
- When shared on social media, the artwork image and title appear
- Sitemap generated and updated automatically
- Artwork pages marked up with structured data for search engines
- Readable URLs: `/eserler/sessiz-otaq`, not numeric
- Sold artwork pages are never deleted. They carry search value and show the gallery's history

---

## 8. Technical requirements

- Page load under 3 seconds on mobile data
- All pages work correctly on phones
- Daily automatic backup of database and images
- SSL certificate
- Rate limiting on admin login attempts
- Downtime alerting
- Visitor analytics (Google Analytics or an alternative)

---

## 9. Out of scope for phase one

To be discussed in phase two. Not built now, but the structure must not block them:

- Online payment
- Shipping calculation
- User registration and personal accounts
- Wishlist
- Auction functionality
- Separate artist portal
- Newsletter

---

## 10. Definition of done

The backend is considered complete when:

1. Every feature in the demo works with real data
2. A new artist, artwork or exhibition can be added from the admin panel and appears on the site immediately
3. Filters work and persist in the URL
4. Form submissions arrive both in the database and by email
5. Images are optimised and load quickly on mobile
6. The structure is ready for the second language
7. Backups are running
8. The gallery owner has been trained on the panel and given a short written guide

---

## 11. Suggested order of work

1. Database structure (artist, artwork, exhibition, enquiry)
2. Admin panel, starting with the artwork entry form
3. Image upload and optimisation
4. Public pages, starting with the catalogue and filters
5. Forms and email notifications
6. Moving page text into the admin panel
7. SEO and sitemap
8. Performance optimisation and testing
9. Backups and security
10. Training and handover
