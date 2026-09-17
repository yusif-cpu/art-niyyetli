<?php

namespace Tests\Unit\Support\Seo;

use App\Enums\Locale;
use App\Support\Seo\SeoLabels;
use Tests\TestCase;

class SeoLabelsTest extends TestCase
{
    public function test_returns_the_azerbaijani_label(): void
    {
        $this->assertSame('Əsərlər', SeoLabels::label(Locale::Az, 'artworks'));
        $this->assertSame('Rəssamlar', SeoLabels::label(Locale::Az, 'artists'));
        $this->assertSame('Sərgilər', SeoLabels::label(Locale::Az, 'exhibitions'));
        $this->assertSame('Jurnal', SeoLabels::label(Locale::Az, 'articles'));
        $this->assertSame('Ana səhifə', SeoLabels::label(Locale::Az, 'home'));
    }

    public function test_returns_the_english_label(): void
    {
        $this->assertSame('Artworks', SeoLabels::label(Locale::En, 'artworks'));
        $this->assertSame('Artists', SeoLabels::label(Locale::En, 'artists'));
        $this->assertSame('Exhibitions', SeoLabels::label(Locale::En, 'exhibitions'));
        $this->assertSame('Journal', SeoLabels::label(Locale::En, 'articles'));
        $this->assertSame('Home', SeoLabels::label(Locale::En, 'home'));
    }

    public function test_throws_for_an_unknown_key(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        SeoLabels::label(Locale::Az, 'nonexistent');
    }
}
