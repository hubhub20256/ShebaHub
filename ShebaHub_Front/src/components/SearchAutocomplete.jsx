import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FiSearch } from "react-icons/fi";
import "./SearchAutocomplete.css";

const MAX_SUGGESTIONS = 8;
const MIN_QUERY_LENGTH = 2;

/**
 * Drop-in replacement for the existing search input pattern.
 * Renders the same FiSearch + input structure but adds a typeahead dropdown.
 *
 * Props:
 *   value          - current search query string
 *   onChange        - (newValue: string) => void
 *   placeholder     - input placeholder text
 *   items           - the full data list (already loaded)
 *   extractTerms    - (item) => string[]  — returns searchable terms for one item
 *   wrapperClassName - CSS class for the outer row div (e.g. "researches-search-row")
 *   innerClassName   - CSS class for the inner wrapper (e.g. "researches-search-wrapper")
 *   inputClassName   - CSS class for the input (e.g. "researches-search-input")
 *   iconClassName    - CSS class for the FiSearch icon (e.g. "researches-search-icon")
 */
export default function SearchAutocomplete({
  value,
  onChange,
  placeholder,
  items = [],
  extractTerms,
  wrapperClassName = "",
  innerClassName = "",
  inputClassName = "",
  iconClassName = "",
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef(null);
  const listRef = useRef(null);

  // Build a flat, deduplicated list of all searchable terms from items.
  const allTerms = useMemo(() => {
    if (!extractTerms || !items.length) return [];
    const set = new Set();
    for (const item of items) {
      const terms = extractTerms(item);
      for (const t of terms) {
        if (t && typeof t === "string" && t.trim()) {
          set.add(t.trim());
        }
      }
    }
    return Array.from(set);
  }, [items, extractTerms]);

  // Filter suggestions based on current query.
  const suggestions = useMemo(() => {
    const q = value.trim().toLowerCase();
    if (q.length < MIN_QUERY_LENGTH) return [];

    const matches = [];
    for (const term of allTerms) {
      if (term.toLowerCase().includes(q) && term.toLowerCase() !== q) {
        matches.push(term);
      }
      if (matches.length >= MAX_SUGGESTIONS) break;
    }
    return matches;
  }, [value, allTerms]);

  // Show dropdown when we have suggestions
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsOpen(suggestions.length > 0);
    setActiveIndex(-1);
  }, [suggestions]);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Scroll active item into view
  useEffect(() => {
    if (activeIndex >= 0 && listRef.current) {
      const el = listRef.current.children[activeIndex];
      if (el) el.scrollIntoView({ block: "nearest" });
    }
  }, [activeIndex]);

  const selectSuggestion = useCallback(
    (term) => {
      onChange(term);
      setIsOpen(false);
      setActiveIndex(-1);
    },
    [onChange],
  );

  function handleKeyDown(e) {
    if (!isOpen || suggestions.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
    } else if (e.key === "Enter" && activeIndex >= 0) {
      e.preventDefault();
      selectSuggestion(suggestions[activeIndex]);
    } else if (e.key === "Escape") {
      setIsOpen(false);
      setActiveIndex(-1);
    }
  }

  // Highlight the matching substring within a suggestion
  function highlightMatch(text) {
    const q = value.trim();
    if (!q) return text;
    const idx = text.toLowerCase().indexOf(q.toLowerCase());
    if (idx === -1) return text;
    return (
      <>
        {text.slice(0, idx)}
        <strong className="sa-highlight">{text.slice(idx, idx + q.length)}</strong>
        {text.slice(idx + q.length)}
      </>
    );
  }

  return (
    <div className={wrapperClassName} ref={containerRef}>
      <div className={`${innerClassName} sa-container`}>
        <FiSearch className={iconClassName} />
        <input
          type="text"
          className={inputClassName}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (suggestions.length > 0) setIsOpen(true);
          }}
          role="combobox"
          aria-expanded={isOpen}
          aria-autocomplete="list"
          aria-controls="sa-listbox"
          aria-activedescendant={activeIndex >= 0 ? `sa-option-${activeIndex}` : undefined}
          autoComplete="off"
        />

        {isOpen && suggestions.length > 0 && (
          <ul
            id="sa-listbox"
            ref={listRef}
            className="sa-dropdown"
            role="listbox"
          >
            {suggestions.map((term, i) => (
              <li
                key={term}
                id={`sa-option-${i}`}
                role="option"
                aria-selected={i === activeIndex}
                className={`sa-option ${i === activeIndex ? "sa-option-active" : ""}`}
                onMouseDown={(e) => {
                  e.preventDefault(); // prevent input blur
                  selectSuggestion(term);
                }}
                onMouseEnter={() => setActiveIndex(i)}
              >
                <FiSearch className="sa-option-icon" />
                <span className="sa-option-text">{highlightMatch(term)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
