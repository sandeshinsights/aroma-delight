"use client";

import { useMemo, useEffect } from "react";
import { generateDateOptions, generateTimeSlots } from "@/lib/ordering-hours";

interface TimeSlotPickerProps {
  selectedDate: Date | null;
  onDateChange: (date: Date) => void;
  selectedTime: string | null;
  onTimeChange: (time: string | null) => void;
}

export default function TimeSlotPicker({
  selectedDate,
  onDateChange,
  selectedTime,
  onTimeChange,
}: TimeSlotPickerProps) {
  const dateOptions = useMemo(() => generateDateOptions(), []);

  // Auto-select first date on mount
  useEffect(() => {
    if (!selectedDate && dateOptions.length > 0) {
      onDateChange(dateOptions[0].date);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const timeSlots = useMemo(
    () => (selectedDate ? generateTimeSlots(selectedDate) : []),
    [selectedDate]
  );

  // Clear time when date changes
  useEffect(() => {
    onTimeChange(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate]);

  return (
    <div className="space-y-4">
      {/* Date chips */}
      <div>
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
          Select Date
        </p>
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
          {dateOptions.map((option) => {
            const isSelected =
              selectedDate &&
              option.date.getDate() === selectedDate.getDate() &&
              option.date.getMonth() === selectedDate.getMonth() &&
              option.date.getFullYear() === selectedDate.getFullYear();

            return (
              <button
                key={option.label}
                onClick={() => onDateChange(option.date)}
                className={`shrink-0 px-3 py-2 rounded-lg text-xs font-medium border transition-colors ${
                  isSelected
                    ? "bg-primary text-cream border-primary"
                    : "bg-white text-text-main border-ink/15 hover:border-primary/40"
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Time slot grid */}
      {selectedDate && (
        <div>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
            Select Time
          </p>
          {timeSlots.every((s) => s.disabled) ? (
            <p className="text-sm text-gray-400">
              No available slots for this date.
            </p>
          ) : (
            <div className="grid grid-cols-4 gap-1.5">
              {timeSlots.map((slot) => (
                <button
                  key={slot.value}
                  onClick={() => !slot.disabled && onTimeChange(slot.value)}
                  disabled={slot.disabled}
                  className={`py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                    selectedTime === slot.value
                      ? "bg-secondary text-ink border-secondary"
                      : slot.disabled
                        ? "bg-ink/5 text-ink/25 border-ink/10 cursor-not-allowed"
                        : "bg-white text-text-main border-ink/15 hover:border-secondary/50"
                  }`}
                >
                  {slot.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}