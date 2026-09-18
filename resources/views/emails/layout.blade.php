<!DOCTYPE html>
<html lang="az" xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>@yield('title', \App\Support\Seo\SeoText::SITE_NAME)</title>
<style>
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    body { margin: 0; padding: 0; width: 100% !important; background-color: #f4f4f5; }

    @media only screen and (max-width: 600px) {
        .email-container { width: 100% !important; }
        .email-padding { padding-left: 20px !important; padding-right: 20px !important; }
    }

    @media (prefers-color-scheme: dark) {
        .email-bg { background-color: #f4f4f5 !important; }
        .email-card { background-color: #ffffff !important; }
        .email-text { color: #171717 !important; }
    }
</style>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">@yield('preheader', '')</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="email-bg" style="background-color:#f4f4f5;">
<tr>
<td align="center" style="padding:32px 16px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" class="email-container" style="width:600px;max-width:600px;">
<tr>
<td class="email-padding" style="background-color:#171717;border-radius:8px 8px 0 0;padding:28px 32px;text-align:center;">
<img src="{{ $message->embed(public_path('images/logo-horizontal-ivory.png')) }}" width="180" alt="{{ \App\Support\Seo\SeoText::SITE_NAME }}" style="display:inline-block;width:180px;max-width:180px;height:auto;border:0;outline:none;text-decoration:none;">
</td>
</tr>
<tr>
<td class="email-card email-padding" style="background-color:#ffffff;border:1px solid #e5e5e5;border-top:none;padding:32px;font-family:Helvetica,Arial,sans-serif;">
@yield('content')
</td>
</tr>
<tr>
<td style="padding:24px 32px;text-align:center;font-family:Helvetica,Arial,sans-serif;font-size:12px;line-height:1.5;color:#9ca3af;">
{{ \App\Support\Seo\SeoText::SITE_NAME }}<br>
Bu e-poçt avtomatik olaraq göndərilmişdir.
</td>
</tr>
</table>
</td>
</tr>
</table>
</body>
</html>
