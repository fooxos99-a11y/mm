<?php

namespace App\Support\Security;

use DOMDocument;
use DOMElement;
use DOMNode;

final class RichTextSanitizer
{
    /** @var array<string, true> */
    private const ALLOWED_TAGS = [
        'a' => true, 'blockquote' => true, 'br' => true, 'code' => true, 'del' => true,
        'div' => true, 'em' => true, 'h1' => true, 'h2' => true, 'h3' => true,
        'h4' => true, 'h5' => true, 'h6' => true, 'hr' => true, 'img' => true,
        'li' => true, 'ol' => true, 'p' => true, 'pre' => true, 's' => true,
        'span' => true, 'strong' => true, 'sub' => true, 'sup' => true, 'table' => true,
        'tbody' => true, 'td' => true, 'tfoot' => true, 'th' => true, 'thead' => true,
        'tr' => true, 'u' => true, 'ul' => true,
    ];

    /** @var array<string, true> */
    private const DROP_WITH_CONTENT = [
        'applet' => true, 'audio' => true, 'embed' => true, 'iframe' => true, 'math' => true,
        'object' => true, 'script' => true, 'style' => true, 'svg' => true, 'template' => true,
        'video' => true,
    ];

    /** @var array<string, array<string, true>> */
    private const ATTRIBUTES = [
        '*' => ['class' => true, 'dir' => true, 'style' => true],
        'a' => ['href' => true, 'rel' => true, 'target' => true],
        'img' => [
            'alt' => true, 'data-height-px' => true, 'data-width-px' => true,
            'data-x' => true, 'data-y' => true, 'draggable' => true, 'height' => true,
            'src' => true, 'width' => true,
        ],
        'table' => ['table_id' => true],
        'tr' => ['row_id' => true],
        'td' => [
            'cell_id' => true, 'colspan' => true, 'merge_id' => true, 'row_id' => true,
            'rowspan' => true, 'table_id' => true,
        ],
        'th' => [
            'cell_id' => true, 'colspan' => true, 'merge_id' => true, 'row_id' => true,
            'rowspan' => true, 'table_id' => true,
        ],
    ];

    /** @var array<string, true> */
    private const STYLE_PROPERTIES = [
        'background' => true, 'background-color' => true, 'border' => true,
        'border-bottom' => true, 'border-collapse' => true, 'border-left' => true,
        'border-radius' => true, 'border-right' => true, 'border-spacing' => true,
        'border-top' => true, 'bottom' => true, 'clear' => true, 'color' => true,
        'direction' => true, 'display' => true, 'float' => true, 'font-family' => true,
        'font-size' => true, 'font-style' => true, 'font-weight' => true, 'height' => true,
        'left' => true, 'letter-spacing' => true, 'line-height' => true, 'margin' => true,
        'margin-bottom' => true, 'margin-left' => true, 'margin-right' => true,
        'margin-top' => true, 'max-height' => true, 'max-width' => true, 'min-height' => true,
        'min-width' => true, 'object-fit' => true, 'opacity' => true, 'overflow' => true,
        'padding' => true, 'padding-bottom' => true, 'padding-left' => true,
        'padding-right' => true, 'padding-top' => true, 'position' => true, 'right' => true,
        'text-align' => true, 'text-decoration' => true, 'top' => true, 'transform' => true,
        'vertical-align' => true, 'white-space' => true, 'width' => true, 'word-break' => true,
    ];

    public function sanitize(string $html): string
    {
        if ($html === '' || ! str_contains($html, '<')) {
            return $html;
        }

        $document = new DOMDocument('1.0', 'UTF-8');
        $previous = libxml_use_internal_errors(true);
        $document->loadHTML(
            '<?xml encoding="UTF-8"><div data-rich-text-root="1">'.$html.'</div>',
            LIBXML_HTML_NOIMPLIED | LIBXML_HTML_NODEFDTD | LIBXML_NONET,
        );
        libxml_clear_errors();
        libxml_use_internal_errors($previous);

        $root = $this->findRoot($document);
        if (! $root) {
            return '';
        }

        $this->sanitizeChildren($root);

        $result = '';
        foreach ($this->children($root) as $child) {
            $result .= $document->saveHTML($child) ?: '';
        }

        return $result;
    }

    private function findRoot(DOMDocument $document): ?DOMElement
    {
        foreach ($document->getElementsByTagName('div') as $element) {
            if ($element->getAttribute('data-rich-text-root') === '1') {
                return $element;
            }
        }

        return null;
    }

    private function sanitizeChildren(DOMNode $parent): void
    {
        foreach ($this->children($parent) as $node) {
            if ($node->nodeType === XML_COMMENT_NODE || $node->nodeType === XML_PI_NODE) {
                $parent->removeChild($node);

                continue;
            }

            if (! $node instanceof DOMElement) {
                continue;
            }

            $tag = strtolower($node->tagName);
            if (isset(self::DROP_WITH_CONTENT[$tag])) {
                $parent->removeChild($node);

                continue;
            }

            if (! isset(self::ALLOWED_TAGS[$tag])) {
                $this->sanitizeChildren($node);
                while ($node->firstChild) {
                    $parent->insertBefore($node->firstChild, $node);
                }
                $parent->removeChild($node);

                continue;
            }

            $this->sanitizeAttributes($node, $tag);
            $this->sanitizeChildren($node);
        }
    }

    private function sanitizeAttributes(DOMElement $element, string $tag): void
    {
        $allowed = [...array_keys(self::ATTRIBUTES['*']), ...array_keys(self::ATTRIBUTES[$tag] ?? [])];

        foreach (iterator_to_array($element->attributes) as $attribute) {
            $name = strtolower($attribute->name);
            $value = $attribute->value;

            if (! in_array($name, $allowed, true) || str_starts_with($name, 'on')) {
                $element->removeAttributeNode($attribute);

                continue;
            }

            if ($name === 'style') {
                $safeStyle = $this->sanitizeStyle($value);
                $safeStyle === ''
                    ? $element->removeAttribute($name)
                    : $element->setAttribute($name, $safeStyle);
            } elseif ($name === 'class') {
                $classes = array_filter(
                    preg_split('/\s+/', trim($value)) ?: [],
                    static fn (string $class): bool => preg_match('/^ql-[a-z0-9_-]+$/i', $class) === 1,
                );
                $classes === []
                    ? $element->removeAttribute($name)
                    : $element->setAttribute($name, implode(' ', $classes));
            } elseif (in_array($name, ['href', 'src'], true) && ! $this->isSafeUrl($value)) {
                $element->removeAttribute($name);
            }
        }

        if ($tag === 'a' && $element->getAttribute('target') === '_blank') {
            $element->setAttribute('rel', 'noopener noreferrer');
        }
    }

    private function sanitizeStyle(string $style): string
    {
        $safe = [];
        foreach (explode(';', $style) as $declaration) {
            if (! str_contains($declaration, ':')) {
                continue;
            }

            [$property, $value] = array_map('trim', explode(':', $declaration, 2));
            $property = strtolower($property);

            if (
                ! isset(self::STYLE_PROPERTIES[$property])
                || $value === ''
                || preg_match('/expression\s*\(|javascript:|vbscript:|data:text\/html|url\s*\(/i', $value)
            ) {
                continue;
            }

            $safe[] = $property.': '.$value;
        }

        return implode('; ', $safe);
    }

    private function isSafeUrl(string $url): bool
    {
        $url = trim(preg_replace('/[\x00-\x1F\x7F]+/u', '', html_entity_decode($url, ENT_QUOTES | ENT_HTML5)) ?? '');

        return preg_match('/^(?:https?:|mailto:|tel:)/i', $url) === 1
            || preg_match('/^data:image\/(?:png|jpe?g|gif|webp);base64,[a-z0-9+\/=\s]+$/i', $url) === 1;
    }

    /** @return list<DOMNode> */
    private function children(DOMNode $node): array
    {
        return iterator_to_array($node->childNodes, false);
    }
}
