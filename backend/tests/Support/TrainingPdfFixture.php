<?php

namespace Tests\Support;

final class TrainingPdfFixture
{
    public static function bytes(bool $incompleteStream = false): string
    {
        $content = "BT /F1 18 Tf 50 750 Td (Training material) Tj ET\n".str_repeat("% repeated padding for compression\n", 1500);
        if ($incompleteStream) {
            $content = substr(gzcompress($content), 0, -4);
        }
        $objects = [
            '<< /Type /Catalog /Pages 2 0 R >>',
            '<< /Type /Pages /Count 1 /Kids [3 0 R] >>',
            '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
            '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
            '<< /Length '.strlen($content).($incompleteStream ? ' /Filter /FlateDecode' : '')." >>\nstream\n".$content."\nendstream",
        ];
        $pdf = "%PDF-1.4\n".($incompleteStream ? str_repeat("% removable padding\n", 1500) : '');
        $offsets = [];
        foreach ($objects as $index => $object) {
            $offsets[] = strlen($pdf);
            $pdf .= ($index + 1)." 0 obj\n".$object."\nendobj\n";
        }
        $xref = strlen($pdf);
        $pdf .= "xref\n0 6\n0000000000 65535 f \n";
        foreach ($offsets as $offset) {
            $pdf .= sprintf("%010d 00000 n \n", $offset);
        }

        return $pdf."trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n".$xref."\n%%EOF\n";
    }
}
