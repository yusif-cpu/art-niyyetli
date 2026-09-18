@extends('emails.layout')

@section('title', 'Cavab')

@section('preheader')
{{ \Illuminate\Support\Str::limit($body, 100) }}
@endsection

@section('content')
<p style="margin:0 0 16px;font-size:15px;color:#171717;">Salam, {{ $enquiry->name }},</p>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#fafaf9;border:1px solid #e5e5e5;border-radius:6px;margin:0 0 20px;">
<tr>
<td style="padding:18px 20px;font-size:14px;line-height:1.6;color:#171717;">{!! nl2br(e($body)) !!}</td>
</tr>
</table>

@if ($enquiry->subject?->key === 'buy' && ($enquiry->inventory_code || $enquiry->artwork))
<p style="margin:0;font-size:13px;color:#6b7280;">
Sorğunuz: <strong style="color:#171717;">{{ $enquiry->artwork?->translations->firstWhere('locale', \App\Enums\Locale::Az)?->title ?? $enquiry->inventory_code }}</strong>
@if ($enquiry->inventory_code)
({{ $enquiry->inventory_code }})
@endif
</p>
@elseif ($enquiry->subject?->translations->firstWhere('locale', \App\Enums\Locale::Az)?->name)
<p style="margin:0;font-size:13px;color:#6b7280;">
Mövzu: <strong style="color:#171717;">{{ $enquiry->subject->translations->firstWhere('locale', \App\Enums\Locale::Az)?->name }}</strong>
</p>
@endif
@endsection
