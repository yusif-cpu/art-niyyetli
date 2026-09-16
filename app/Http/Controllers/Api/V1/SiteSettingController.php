<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Services\Admin\SiteSettingService;
use Illuminate\Http\JsonResponse;

class SiteSettingController extends Controller
{
    public function __construct(private SiteSettingService $settings) {}

    public function index(): JsonResponse
    {
        return response()->json(['data' => $this->settings->all()]);
    }
}
