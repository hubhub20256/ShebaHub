import React from "react";

export default function AdvancedFilters({
  filtersRef,
  openFilter,
  setOpenFilter,
  filtersConfig,
  hasActiveFilters,
  clearFilters,
  classPrefix = "mentors",
}) {
  return (
    <div className={`${classPrefix}-advanced-filters`} ref={filtersRef}>
      {filtersConfig.map((filter) => {
        if (filter.hidden) return null;

        return (
          <div className={`${classPrefix}-filter-item`} key={filter.key}>
            <button
              type="button"
              className={`${classPrefix}-filter-button`}
              onClick={() =>
                setOpenFilter(openFilter === filter.key ? null : filter.key)
              }
            >
              {filter.label}
              <span>{openFilter === filter.key ? "▲" : "▼"}</span>
            </button>

            {openFilter === filter.key && (
              <div
                className={`${classPrefix}-filter-dropdown ${
                  filter.dropdownClassName || ""
                }`}
              >
                {filter.customContent ? (
                  filter.customContent
                ) : filter.options?.length > 0 ? (
                  <div className={`${classPrefix}-filter-dropdown-column`}>
                    {filter.options.map((option) => (
                      <button
                        key={option}
                        type="button"
                        className={`${classPrefix}-filter-option ${
                          filter.selectedValues.includes(option) ? "active" : ""
                        }`}
                        onClick={() => filter.onToggle(option)}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className={`${classPrefix}-filter-empty`}>
                    אין ערכים זמינים
                  </p>
                )}
              </div>
            )}
          </div>
        );
      })}

      {hasActiveFilters && (
        <button
          type="button"
          className={`${classPrefix}-clear-filters`}
          onClick={clearFilters}
        >
          ניקוי סינון
        </button>
      )}
    </div>
  );
}