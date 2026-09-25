<?php

declare(strict_types=1);

$coveragePath = $argv[1] ?? 'coverage.xml';
$minimumCoverage = null;

foreach (array_slice($argv, 2) as $argument) {
    if (str_starts_with($argument, '--min=')) {
        $minimumCoverage = (float) substr($argument, strlen('--min='));
    }
}

if (! is_file($coveragePath)) {
    fwrite(STDERR, "Coverage file not found: {$coveragePath}".PHP_EOL);
    exit(1);
}

libxml_use_internal_errors(true);
$coverage = simplexml_load_file($coveragePath);

if ($coverage === false || ! isset($coverage->project->metrics)) {
    fwrite(STDERR, "Invalid Clover coverage file: {$coveragePath}".PHP_EOL);
    exit(1);
}

$metrics = $coverage->project->metrics;
$statements = (int) $metrics['statements'];
$coveredStatements = (int) $metrics['coveredstatements'];
$percentage = $statements > 0 ? ($coveredStatements / $statements) * 100 : 0.0;
$summary = sprintf(
    'Backend statement coverage: %.2f%% (%d/%d)',
    $percentage,
    $coveredStatements,
    $statements,
);

fwrite(STDOUT, $summary.PHP_EOL);

$githubSummaryPath = getenv('GITHUB_STEP_SUMMARY');

if (is_string($githubSummaryPath) && $githubSummaryPath !== '') {
    file_put_contents(
        $githubSummaryPath,
        "## Backend coverage\n\n{$summary}\n",
        FILE_APPEND,
    );
}

if ($minimumCoverage !== null && $percentage + 0.00001 < $minimumCoverage) {
    fwrite(
        STDERR,
        sprintf(
            'Coverage %.2f%% is below the required %.2f%%.%s',
            $percentage,
            $minimumCoverage,
            PHP_EOL,
        ),
    );
    exit(1);
}
