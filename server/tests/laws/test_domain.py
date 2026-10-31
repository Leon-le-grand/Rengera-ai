"""Source-fidelity rules that must survive repository and HTTP serialization."""

from __future__ import annotations

import pytest

from app.domain.laws import (
    normalize_languages,
    normalize_optional_text,
    normalize_status,
    normalize_type,
    validate_source_url,
)


@pytest.mark.parametrize(
    ("stored", "expected"),
    [
        (None, "unknown"),
        ("", "unknown"),
        ("   ", "unknown"),
        ("active", "active"),
        ("amended", "amended"),
        ("repealed", "repealed"),
        ("suspended", "suspended"),
    ],
)
def test_unknown_or_future_status_is_never_rewritten_to_active(
    stored: str | None, expected: str
) -> None:
    assert normalize_status(stored) == expected


def test_type_has_its_own_unknown_default() -> None:
    assert normalize_type(None) == "unknown"
    assert normalize_type("  ") == "unknown"
    assert normalize_type("amendment") == "amendment"


def test_languages_are_preserved_exactly() -> None:
    assert normalize_languages(None) is None
    assert normalize_languages(()) == ()
    assert normalize_languages(["en", "rw"]) == ("en", "rw")
    assert normalize_languages("fr") == ("fr",)


def test_optional_text_collapses_blank_values() -> None:
    assert normalize_optional_text(None) is None
    assert normalize_optional_text("  ") is None
    assert normalize_optional_text("  value  ") == "value"


@pytest.mark.parametrize(
    "value",
    [
        None,
        "",
        "   ",
        "not a url",
        "ftp://example.test/law.pdf",
        "javascript:alert(1)",
        "https://",
        "https://example.test",
        "https://example.test/",
        "https://user:secret@example.test/law.pdf",
        "https://example.test/law doc.pdf",
    ],
)
def test_source_url_never_invents_or_exposes_unsafe_provenance(value: str | None) -> None:
    assert validate_source_url(value) is None


@pytest.mark.parametrize(
    "value",
    [
        "https://example.test/law.pdf",
        "http://example.test/law.pdf#page=2",
        " https://example.test/viewer?doc=law-1 ",
    ],
)
def test_document_urls_are_returned_unchanged(value: str) -> None:
    assert validate_source_url(value) == value.strip()
