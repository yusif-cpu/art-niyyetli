@extends('emails.layout')

@section('title', 'Yeni sorğu')

@section('preheader')
Yeni sorğu daxil oldu — {{ $enquiry->name }}
@endsection

@section('content')
<p style="margin:0 0 16px;display:inline-block;padding:4px 12px;background-color:#f4f4f5;border-radius:999px;font-size:12px;font-weight:600;letter-spacing:0.3px;color:#171717;text-transform:uppercase;">Yeni sorğu</p>

<h1 style="margin:0 0 20px;font-size:20px;line-height:1.3;color:#171717;">
@if ($enquiry->subject->key === 'buy')
{{ $enquiry->artwork?->translations->firstWhere('locale', \App\Enums\Locale::Az)?->title ?? $enquiry->inventory_code }}
@else
{{ $enquiry->subject->translations->firstWhere('locale', \App\Enums\Locale::Az)?->name }}
@endif
</h1>

@if ($enquiry->subject->key === 'buy')
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;background-color:#fafaf9;border:1px solid #e5e5e5;border-radius:6px;">
<tr>
<td style="padding:14px 18px;font-size:14px;line-height:1.5;color:#171717;">
<strong>İnventar kodu:</strong> {{ $enquiry->inventory_code }}
</td>
</tr>
</table>
@endif

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;font-size:14px;color:#171717;">
<tr>
<td style="padding:4px 0;width:110px;color:#6b7280;vertical-align:top;">Ad</td>
<td style="padding:4px 0;">{{ $enquiry->name }}</td>
</tr>
<tr>
<td style="padding:4px 0;color:#6b7280;vertical-align:top;">E-poçt</td>
<td style="padding:4px 0;"><a href="mailto:{{ $enquiry->email }}" style="color:#171717;text-decoration:underline;">{{ $enquiry->email }}</a></td>
</tr>
@if ($enquiry->phone)
<tr>
<td style="padding:4px 0;color:#6b7280;vertical-align:top;">Telefon</td>
<td style="padding:4px 0;">{{ $enquiry->phone }}</td>
</tr>
@endif
<tr>
<td style="padding:4px 0;color:#6b7280;vertical-align:top;">Tarix</td>
<td style="padding:4px 0;">{{ $enquiry->submitted_at?->format('Y-m-d H:i') }}</td>
</tr>
</table>

<p style="margin:0 0 8px;font-size:12px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.3px;">Mesaj</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#fafaf9;border:1px solid #e5e5e5;border-radius:6px;margin:0 0 24px;">
<tr>
<td style="padding:16px 18px;font-size:14px;line-height:1.6;color:#171717;">{!! nl2br(e($enquiry->message)) !!}</td>
</tr>
</table>

<table role="presentation" cellpadding="0" cellspacing="0">
<tr>
<td style="border-radius:6px;background-color:#171717;">
<a href="{{ $adminUrl }}" style="display:inline-block;padding:12px 22px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:6px;">Admin paneldə bax</a>
</td>
</tr>
</table>
@endsection
