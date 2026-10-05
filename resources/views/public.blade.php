<!DOCTYPE html>
<html lang="az">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    {{-- The brand mark alone, in brand red: SVG first, a 32px PNG for browsers without SVG icons, and the 180px
         apple-touch-icon on the surface colour (iOS fills transparency with black). favicon.ico stays Laravel's. --}}
    <link rel="icon" type="image/svg+xml" href="/favicon.svg">
    <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png">
    <link rel="apple-touch-icon" href="/apple-touch-icon.png">
    <meta name="theme-color" content="#3E0B0A">
    <title>{{ $seo->title }}</title>
    @if ($seo->description)
        <meta name="description" content="{{ $seo->description }}">
    @endif
    @if ($seo->canonicalUrl)
        <link rel="canonical" href="{{ $seo->canonicalUrl }}">
    @endif
    <meta name="robots" content="{{ $seo->robotsContent() }}">

    <meta property="og:site_name" content="{{ \App\Support\Seo\SeoText::SITE_NAME }}">
    <meta property="og:type" content="{{ $seo->ogType }}">
    <meta property="og:title" content="{{ $seo->title }}">
    @if ($seo->description)
        <meta property="og:description" content="{{ $seo->description }}">
    @endif
    @if ($seo->canonicalUrl)
        <meta property="og:url" content="{{ $seo->canonicalUrl }}">
    @endif
    <meta property="og:locale" content="{{ $seo->ogLocale }}">
    @if ($seo->ogImageUrl)
        <meta property="og:image" content="{{ $seo->ogImageUrl }}">
    @endif

    <meta name="twitter:card" content="{{ $seo->ogImageUrl ? 'summary_large_image' : 'summary' }}">
    <meta name="twitter:title" content="{{ $seo->title }}">
    @if ($seo->description)
        <meta name="twitter:description" content="{{ $seo->description }}">
    @endif
    @if ($seo->ogImageUrl)
        <meta name="twitter:image" content="{{ $seo->ogImageUrl }}">
    @endif

    @if ($seo->jsonLd)
        <script type="application/ld+json">{!! json_encode($seo->jsonLd, JSON_HEX_TAG | JSON_HEX_AMP | JSON_UNESCAPED_UNICODE) !!}</script>
    @endif

    @viteReactRefresh
    @vite(['resources/css/public.css', 'resources/js/public/main.jsx'])
</head>
<body class="bg-surface text-ink font-ui antialiased">
    <div id="public-root"></div>
</body>
</html>
