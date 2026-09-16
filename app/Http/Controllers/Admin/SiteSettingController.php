<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\UpdateSiteSettingsRequest;
use App\Services\Admin\SiteSettingService;
use Illuminate\Http\JsonResponse;

class SiteSettingController extends Controller
{
    public function __construct(private SiteSettingService $settings) {}

    public function index(): JsonResponse
    {
        return response()->json(['data' => $this->settings->all()]);
    }

    public function update(UpdateSiteSettingsRequest $request): JsonResponse
    {
        return response()->json(['data' => $this->settings->update($request->validated())]);
    }
}
