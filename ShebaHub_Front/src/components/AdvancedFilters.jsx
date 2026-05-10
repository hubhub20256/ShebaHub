import React from "react";

export default function AdvancedFilters({
  filtersRef,
  openFilter,
  setOpenFilter,
  filtersConfig,
  hasActiveFilters,
  clearFilters,
}) {
  return (
    <div className="mentors-advanced-filters" ref={filtersRef}>
      {filtersConfig.map((filter) => {
        if (filter.hidden) return null;

        return (
          <div className="mentors-filter-item" key={filter.key}>
            <button
              type="button"
              className="mentors-filter-button"
              onClick={() =>
                setOpenFilter(
                  openFilter === filter.key ? null : filter.key
                )
              }
            >
              {filter.label}

              <span>
                {openFilter === filter.key ? "▲" : "▼"}
              </span>
            </button>

            {openFilter === filter.key && (
              <div
                className={`mentors-filter-dropdown ${
                  filter.dropdownClassName || ""
                }`}
              >
                {filter.customContent ? (
                  filter.customContent
                ) : (
                  <div className="mentors-filter-dropdown-column">
                    {filter.options.map((option) => (
                      <button
                        key={option}
                        type="button"
                        className={`mentors-filter-option ${
                          filter.selectedValues.includes(option)
                            ? "active"
                            : ""
                        }`}
                        onClick={() => filter.onToggle(option)}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}

      {hasActiveFilters && (
        <button
          type="button"
          className="mentors-clear-filters"
          onClick={clearFilters}
        >
          ניקוי סינון
        </button>
      )}
    </div>
  );
}