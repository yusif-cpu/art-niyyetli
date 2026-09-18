<p>Yeni sorğu alındı.</p>

@if ($enquiry->subject->key === 'buy')
<p>
    <strong>Əsər:</strong> {{ $enquiry->artwork?->translations->firstWhere('locale', \App\Enums\Locale::Az)?->title ?? $enquiry->inventory_code }}<br>
    <strong>İnventar kodu:</strong> {{ $enquiry->inventory_code }}
</p>
@else
<p>
    <strong>Mövzu:</strong> {{ $enquiry->subject->translations->firstWhere('locale', \App\Enums\Locale::Az)?->name }}
</p>
@endif

<p>
    <strong>Ad:</strong> {{ $enquiry->name }}<br>
    <strong>E-poçt:</strong> {{ $enquiry->email }}<br>
    @if ($enquiry->phone)
    <strong>Telefon:</strong> {{ $enquiry->phone }}<br>
    @endif
    <strong>Tarix:</strong> {{ $enquiry->submitted_at?->format('Y-m-d H:i') }}
</p>

<p><strong>Mesaj:</strong><br>{{ $enquiry->message }}</p>

<p><a href="{{ $adminUrl }}">Admin paneldə bax</a></p>
