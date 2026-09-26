<?php

namespace Tests\Unit;

use App\Support\Security\RichTextSanitizer;
use PHPUnit\Framework\TestCase;

class RichTextSanitizerTest extends TestCase
{
    public function test_it_removes_active_content_and_unsafe_attributes(): void
    {
        $html = '<script>alert(1)</script><p onclick="alert(2)" class="ql-align-center evil" '
            .'style="color: red; background-image: url(javascript:alert(3))">آمن '
            .'<a href="javascript:alert(4)">رابط</a>'
            .'<img src="data:text/html;base64,PHNjcmlwdD4=" onerror="alert(5)" onloadstart="alert(6)"></p>';

        $sanitized = (new RichTextSanitizer)->sanitize($html);

        $this->assertStringNotContainsStringIgnoringCase('script', $sanitized);
        $this->assertStringNotContainsStringIgnoringCase('onclick', $sanitized);
        $this->assertStringNotContainsStringIgnoringCase('onerror', $sanitized);
        $this->assertStringNotContainsStringIgnoringCase('onloadstart', $sanitized);
        $this->assertStringNotContainsStringIgnoringCase('javascript:', $sanitized);
        $this->assertStringNotContainsStringIgnoringCase('data:text/html', $sanitized);
        $this->assertStringContainsString('class="ql-align-center"', $sanitized);
        $this->assertStringContainsString('style="color: red"', $sanitized);
        $this->assertStringContainsString('آمن', $sanitized);
    }

    public function test_it_preserves_safe_rich_text_and_secures_new_windows(): void
    {
        $sanitized = (new RichTextSanitizer)->sanitize(
            '<blockquote><strong>نص</strong> <a href="https://example.com" target="_blank">مرجع</a></blockquote>',
        );

        $this->assertStringContainsString('<blockquote>', $sanitized);
        $this->assertStringContainsString('<strong>نص</strong>', $sanitized);
        $this->assertStringContainsString('href="https://example.com"', $sanitized);
        $this->assertStringContainsString('rel="noopener noreferrer"', $sanitized);
    }

    public function test_it_is_idempotent(): void
    {
        $sanitizer = new RichTextSanitizer;
        $once = $sanitizer->sanitize('<p style="color: #123456" onclick="x()">نص</p>');

        $this->assertSame($once, $sanitizer->sanitize($once));
    }
}
