<?php

return [
    'qpdf' => env('TRAINING_PREVIEW_QPDF', is_file(base_path('../runtime/qpdf-runner')) ? base_path('../runtime/qpdf-runner') : 'qpdf'),
    'queue' => 'default',
];
