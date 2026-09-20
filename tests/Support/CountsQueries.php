<?php

namespace Tests\Support;

use Closure;
use Illuminate\Support\Facades\DB;

/**
 * Measures the SQL a piece of code runs, for N+1 / query-budget assertions.
 */
trait CountsQueries
{
    /**
     * @return array<int, string> the SQL text of every statement the callback ran
     */
    protected function captureQueries(Closure $callback): array
    {
        DB::flushQueryLog();
        DB::enableQueryLog();

        try {
            $callback();

            return array_column(DB::getQueryLog(), 'query');
        } finally {
            DB::disableQueryLog();
            DB::flushQueryLog();
        }
    }

    protected function countQueries(Closure $callback): int
    {
        return count($this->captureQueries($callback));
    }
}
