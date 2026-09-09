/* ── Ordering Hours Utility ──────────────────────────────────────
 * All times are in Eastern Time (America/New_York).
 * Provides:
 *  - isOrderingWindowOpen()  → can the customer order NOW (asap)?
 *  - generateTimeSlots()     → 15-min slots for a given date
 *  - generateDateOptions()   → available dates (today + next 7 days)
 *  - formatMinutesTo12h()    → minutes (690) → "11:30 AM"
 *  - formatScheduledPickup() → "2026-06-19" + "16:00" → "Thursday, June 19 at 4:00 PM"
 *  - isValidScheduledTime()  → server-side validation (timezone-safe)
 */

// Aroma Delight is open 11:00 AM - 10:00 PM every day. Online ordering closes
// 30 min before the kitchen does so the last order can still be made.
// NOTE: these are hardcoded here, not read from restaurant.json's orderingConfig
// block — that block is currently unused. Keep the two in sync by hand.
export const ORDERING_CONFIG = {
  openTime: "11:00",
  closeTime: "21:30",
  orderingStarts: "11:00",
  orderingEnds: "21:30",
  slotIntervalMinutes: 15,
  minLeadTimeMinutes: 30,
  maxScheduleDays: 7,
} as const;

const TZ = "America/New_York";

function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function getNowET(): { minutes: number; date: Date } {
  const now = new Date();
  const etString = now.toLocaleString("en-US", { timeZone: TZ });
  const etDate = new Date(etString);
  const minutes = etDate.getHours() * 60 + etDate.getMinutes();
  return { minutes, date: etDate };
}

function formatMinutesTo12h(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return m === 0 ? `${h12}:00 ${ampm}` : `${h12}:${m.toString().padStart(2, "0")} ${ampm}`;
}

export { formatMinutesTo12h };

export function isOrderingWindowOpen(): boolean {
  const { minutes } = getNowET();
  return (
    minutes >= timeToMinutes(ORDERING_CONFIG.orderingStarts) &&
    minutes <= timeToMinutes(ORDERING_CONFIG.orderingEnds)
  );
}

export function getOrderingClosedReason(): string {
  const { minutes } = getNowET();
  if (minutes < timeToMinutes(ORDERING_CONFIG.orderingStarts)) {
    return `Online ordering starts at ${formatMinutesTo12h(timeToMinutes(ORDERING_CONFIG.orderingStarts))}`;
  }
  return `Online ordering ends at ${formatMinutesTo12h(timeToMinutes(ORDERING_CONFIG.orderingEnds))}`;
}

export function generateTimeSlots(date: Date): Array<{
  value: string;
  label: string;
  disabled: boolean;
}> {
  const slots: Array<{ value: string; label: string; disabled: boolean }> = [];
  const openMin = timeToMinutes(ORDERING_CONFIG.openTime);
  const closeMin = timeToMinutes(ORDERING_CONFIG.closeTime);
  const interval = ORDERING_CONFIG.slotIntervalMinutes;
  const leadTime = ORDERING_CONFIG.minLeadTimeMinutes;

  const etNow = new Date(new Date().toLocaleString("en-US", { timeZone: TZ }));
  const isToday =
    date.getDate() === etNow.getDate() &&
    date.getMonth() === etNow.getMonth() &&
    date.getFullYear() === etNow.getFullYear();

  const nowMinutes = etNow.getHours() * 60 + etNow.getMinutes();

  for (let m = openMin; m < closeMin; m += interval) {
    const disabled = isToday && m < nowMinutes + leadTime;
    slots.push({
      value: `${Math.floor(m / 60).toString().padStart(2, "0")}:${(m % 60).toString().padStart(2, "0")}`,
      label: formatMinutesTo12h(m),
      disabled,
    });
  }

  return slots;
}

export function generateDateOptions(): Array<{
  date: Date;
  label: string;
  isToday: boolean;
}> {
  const options: Array<{ date: Date; label: string; isToday: boolean }> = [];
  const etNow = new Date(new Date().toLocaleString("en-US", { timeZone: TZ }));
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const monthNames = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];

  for (let i = 0; i <= ORDERING_CONFIG.maxScheduleDays; i++) {
    const d = new Date(etNow);
    d.setDate(d.getDate() + i);

    const isToday = i === 0;
    const dayOfWeek = d.getDay();

    let label: string;
    if (isToday) {
      label = "Today";
    } else if (i === 1) {
      label = "Tomorrow";
    } else {
      label = `${dayNames[dayOfWeek]}, ${monthNames[d.getMonth()]} ${d.getDate()}`;
    }

    options.push({ date: d, label, isToday });
  }

  return options;
}

/**
 * Format a scheduled pickup for display (timezone-safe).
 * Takes separate date/time strings to avoid timezone parsing issues.
 * Input:  "2026-06-19", "16:00"
 * Output: "Thursday, June 19 at 4:00 PM"
 */
export function formatScheduledPickup(dateStr: string, timeStr: string): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  const [h, m] = timeStr.split(":").map(Number);

  const date = new Date(year, month - 1, day);
  const dayNames = [
    "Sunday", "Monday", "Tuesday", "Wednesday",
    "Thursday", "Friday", "Saturday",
  ];
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];

  const weekday = dayNames[date.getDay()];
  const monthName = monthNames[month - 1];

  const timeFormatted = formatMinutesTo12h(h * 60 + m);

  return `${weekday}, ${monthName} ${day} at ${timeFormatted}`;
}

/**
 * Convert a scheduled ET date+time to a UTC ISO-8601 string.
 * Input:  "2026-06-19", "16:00"  (4:00 PM Eastern)
 * Output: "2026-06-19T20:00:00.000Z"  (during EDT)
 *
 * This is what gets STORED in Order.scheduledFor. It used to hold the
 * human-readable output of formatScheduledPickup ("Thursday, June 19 at
 * 4:00 PM"), which `new Date()` cannot parse — so every consumer that treated
 * scheduledFor as a date (Uber pickup_ready_dt, the dispatch cron's window
 * query, the success page) silently misbehaved: scheduled delivery orders
 * dispatched a courier immediately. Store machine time; format for humans
 * only at display time (formatScheduledDisplay).
 *
 * DST note: the offset is derived at the target instant, so EDT/EST both work.
 * The ambiguous 1-2 AM transition hours can't occur — ordering hours are
 * 11:00-21:30.
 */
export function scheduledTimeToUtcIso(dateStr: string, timeStr: string): string {
  const [y, mo, d] = dateStr.split("-").map(Number);
  const [h, mi] = timeStr.split(":").map(Number);

  // Guess: the desired wall-clock reading taken as if it were UTC.
  const guess = new Date(Date.UTC(y, mo - 1, d, h, mi, 0));

  // Render that instant on both a UTC clock and an ET clock, parse both in the
  // server's local zone — the local-zone bias cancels, leaving the ET offset.
  const utcView = new Date(guess.toLocaleString("en-US", { timeZone: "UTC" }));
  const etView = new Date(guess.toLocaleString("en-US", { timeZone: TZ }));
  const offsetMs = utcView.getTime() - etView.getTime();

  return new Date(guess.getTime() + offsetMs).toISOString();
}

/**
 * Format a stored scheduledFor value for humans, in Eastern Time.
 * ISO input → "Thursday, June 19 at 4:00 PM". Unparseable input (legacy rows
 * that stored the human-readable string directly) is returned as-is.
 */
export function formatScheduledDisplay(value: string | null | undefined): string {
  if (!value) return "";
  const d = new Date(value);
  if (isNaN(d.getTime())) return value;

  const datePart = d.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: TZ,
  });
  const timePart = d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: TZ,
  });
  return `${datePart} at ${timePart}`;
}

/**
 * Server-side validation: is this scheduled date+time valid?
 * Accepts separate dateStr ("2026-06-19") and timeStr ("16:00")
 * to avoid timezone parsing issues with combined ISO strings.
 */
export function isValidScheduledTime(dateStr: string, timeStr: string): boolean {
  try {
    const [h, m] = timeStr.split(":").map(Number);
    if (isNaN(h) || isNaN(m)) return false;
    const slotMinutes = h * 60 + m;

    const openMin = timeToMinutes(ORDERING_CONFIG.openTime);
    const closeMin = timeToMinutes(ORDERING_CONFIG.closeTime);
    if (slotMinutes < openMin || slotMinutes >= closeMin) return false;

    const etNowStr = new Date().toLocaleString("en-US", { timeZone: TZ });
    const etNow = new Date(etNowStr);
    const todayEt = etNow.toLocaleDateString("en-CA", { timeZone: TZ });

    const [year, month, day] = dateStr.split("-").map(Number);
    if (!year || !month || !day) return false;

    const todayParts = todayEt.split("-").map(Number);
    const todayDate = new Date(todayParts[0], todayParts[1] - 1, todayParts[2]);
    const targetDate = new Date(year, month - 1, day);
    const dayDiff = (targetDate.getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24);

    if (dayDiff < 0) return false;
    if (dayDiff > ORDERING_CONFIG.maxScheduleDays) return false;

    if (dayDiff === 0) {
      const nowMinutes = etNow.getHours() * 60 + etNow.getMinutes();
      if (slotMinutes < nowMinutes + ORDERING_CONFIG.minLeadTimeMinutes) return false;
    }

    return true;
  } catch {
    return false;
  }
}