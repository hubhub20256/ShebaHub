import React, { useEffect, useMemo, useRef, useState } from "react";

const DAY_NAMES_HE = ["א", "ב", "ג", "ד", "ה", "ו", "ש"];

const toIsoDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const isValidIsoDate = (value) => {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
};

const parseIsoDate = (value) => {
  if (!isValidIsoDate(value)) return null;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  if (Number.isNaN(date.getTime())) return null;
  return date;
};

const formatDisplayDate = (value) => {
  if (!isValidIsoDate(value)) return "";
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
};

const CalendarDatePicker = ({
  value,
  onChange,
  placeholder = "בחר תאריך",
  minDate,
  disabled = false,
}) => {
  const rootRef = useRef(null);
  const selectedDate = useMemo(() => parseIsoDate(value), [value]);

  const [isOpen, setIsOpen] = useState(false);
  const [viewDate, setViewDate] = useState(selectedDate || new Date());

  useEffect(() => {
    if (selectedDate) {
      setViewDate(selectedDate);
    }
  }, [selectedDate]);

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (!rootRef.current?.contains(event.target)) {
        setIsOpen(false);
      }
    };

    const handleEsc = (event) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("touchstart", handleOutsideClick);
    document.addEventListener("keydown", handleEsc);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("touchstart", handleOutsideClick);
      document.removeEventListener("keydown", handleEsc);
    };
  }, []);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const monthLabel = new Intl.DateTimeFormat("he-IL", {
    month: "long",
    year: "numeric",
  }).format(viewDate);

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();

  const minIso = isValidIsoDate(minDate) ? minDate : "";

  return (
    <div className="tm-date-picker" ref={rootRef}>
      <button
        type="button"
        className="tm-date-trigger"
        disabled={disabled}
        onClick={() => {
          if (!disabled) {
            setIsOpen((prev) => !prev);
          }
        }}
      >
        <span>{formatDisplayDate(value) || placeholder}</span>
      </button>

      {isOpen && !disabled ? (
        <div className="tm-calendar-popup">
          <div className="tm-calendar-header">
            <button
              type="button"
              className="tm-calendar-nav-btn"
              onClick={() => setViewDate(new Date(year, month + 1, 1))}
              aria-label="חודש הבא"
            >
              &lt;
            </button>
            <span className="tm-calendar-month-label">{monthLabel}</span>
            <button
              type="button"
              className="tm-calendar-nav-btn"
              onClick={() => setViewDate(new Date(year, month - 1, 1))}
              aria-label="חודש קודם"
            >
              &gt;
            </button>
          </div>

          <div className="tm-calendar-grid">
            {DAY_NAMES_HE.map((dayName) => (
              <div key={dayName} className="tm-calendar-day-name">
                {dayName}
              </div>
            ))}

            {Array.from({ length: firstDay }).map((_, index) => (
              <div key={`empty-${index}`} className="tm-calendar-empty" />
            ))}

            {Array.from({ length: daysInMonth }).map((_, index) => {
              const day = index + 1;
              const candidate = new Date(year, month, day);
              const iso = toIsoDate(candidate);
              const isDisabled = Boolean(minIso) && iso < minIso;
              const isSelected = value === iso;

              return (
                <button
                  key={iso}
                  type="button"
                  className={`tm-calendar-day-btn ${isSelected ? "is-selected" : ""}`}
                  disabled={isDisabled}
                  onClick={() => {
                    onChange(iso);
                    setIsOpen(false);
                  }}
                >
                  {day}
                </button>
              );
            })}
          </div>

          <div className="tm-calendar-footer">
            <button
              type="button"
              className="tm-calendar-clear-btn"
              onClick={() => {
                onChange("");
                setIsOpen(false);
              }}
              disabled={!value}
            >
              נקה תאריך
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default CalendarDatePicker;
