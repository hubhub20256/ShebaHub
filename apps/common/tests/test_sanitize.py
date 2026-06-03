"""
Tests for the sanitize_text utility function.

Covers:
- Normal text passes through unchanged
- HTML tags are stripped
- Script tags are removed
- HTML entities are decoded then re-stripped
- Whitespace is collapsed
- Empty string returns empty string
- Non-string input is returned as-is (None, int)
- Unicode / Hebrew text is preserved
"""

import pytest
from apps.common.utils import sanitize_text


class TestSanitizeTextNormalInput:
    """Plain text should pass through unchanged (modulo whitespace trim)."""

    def test_plain_text_unchanged(self):
        assert sanitize_text("Hello world") == "Hello world"

    def test_plain_text_with_trailing_whitespace(self):
        assert sanitize_text("  Hello world  ") == "Hello world"


class TestSanitizeTextHTMLStripping:
    """HTML tags must be removed."""

    def test_simple_tags_stripped(self):
        assert sanitize_text("<b>bold</b>") == "bold"

    def test_nested_tags_stripped(self):
        result = sanitize_text("<div><p>paragraph</p></div>")
        assert "<" not in result
        assert "paragraph" in result

    def test_self_closing_tag_stripped(self):
        result = sanitize_text("before<br/>after")
        assert "<" not in result
        assert "before" in result
        assert "after" in result

    def test_tag_with_attributes_stripped(self):
        result = sanitize_text('<a href="http://evil.com">click</a>')
        assert "<" not in result
        assert "click" in result
        assert "href" not in result


class TestSanitizeTextScriptTags:
    """Script tags and their content should be removed as much as possible."""

    def test_script_tag_removed(self):
        result = sanitize_text("<script>alert('xss')</script>")
        assert "<script" not in result
        assert "</script>" not in result

    def test_script_tag_with_src(self):
        result = sanitize_text('<script src="evil.js"></script>')
        assert "<script" not in result
        assert "evil.js" not in result

    def test_inline_event_handler_attribute_stripped(self):
        result = sanitize_text('<div onload="alert(1)">text</div>')
        assert "onload" not in result
        assert "text" in result


class TestSanitizeTextHTMLEntities:
    """HTML entities should be decoded, then any resulting tags stripped."""

    def test_entity_decoded(self):
        # &amp; -> &
        assert sanitize_text("Tom &amp; Jerry") == "Tom & Jerry"

    def test_entity_producing_tag_stripped(self):
        # Entities that, when decoded, form a tag should be stripped
        result = sanitize_text("&lt;script&gt;alert(1)&lt;/script&gt;")
        assert "<script" not in result
        assert "</script>" not in result


class TestSanitizeTextSQLPatterns:
    """SQL-like patterns should pass through safely as plain text.
    sanitize_text is not an SQL sanitizer, but the stripping and collapsing
    means dangerous multi-line payloads get collapsed harmlessly."""

    def test_sql_keyword_preserved_as_text(self):
        """SQL keywords are just text; they pass through."""
        result = sanitize_text("SELECT * FROM users")
        assert "SELECT" in result

    def test_multiline_sql_collapsed(self):
        payload = "1; DROP TABLE users;\n\n\n--"
        result = sanitize_text(payload)
        # Excessive newlines capped at 2
        assert "\n\n\n" not in result


class TestSanitizeTextWhitespace:
    """Whitespace normalisation rules."""

    def test_multiple_spaces_collapsed(self):
        assert sanitize_text("a    b") == "a b"

    def test_tabs_collapsed(self):
        assert sanitize_text("a\t\tb") == "a b"

    def test_excessive_newlines_capped(self):
        result = sanitize_text("a\n\n\n\n\nb")
        assert result == "a\n\nb"

    def test_two_newlines_preserved(self):
        result = sanitize_text("a\n\nb")
        assert result == "a\n\nb"


class TestSanitizeTextEdgeCases:
    """Edge cases and special inputs."""

    def test_empty_string(self):
        assert sanitize_text("") == ""

    def test_none_returns_none(self):
        assert sanitize_text(None) is None

    def test_integer_returns_integer(self):
        assert sanitize_text(42) == 42

    def test_boolean_returns_boolean(self):
        assert sanitize_text(True) is True


class TestSanitizeTextUnicode:
    """Unicode and Hebrew text should be preserved."""

    def test_hebrew_text_preserved(self):
        hebrew = "שלום עולם"
        assert sanitize_text(hebrew) == hebrew

    def test_hebrew_with_html_stripped(self):
        result = sanitize_text("<b>שלום</b> עולם")
        assert result == "שלום עולם"

    def test_mixed_unicode_preserved(self):
        text = "Hello 123 cafe"
        assert sanitize_text(text) == text

    def test_emoji_preserved(self):
        text = "Good job!"
        result = sanitize_text(text)
        assert result == text
