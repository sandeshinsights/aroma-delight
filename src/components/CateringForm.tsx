"use client";

import { useState } from "react";
import { Send, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { getRestaurantData } from "@/lib/data";
// Meta Pixel — Lead is sent from here and from /api/catering under one event id.
import { trackMeta, newMetaEventId, getMetaBrowserIds } from "@/lib/meta-pixel";

export default function CateringForm() {
  const { catering, phone, phoneDisplay } = getRestaurantData();
  const eventTypes = catering.eventTypes || [];

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    eventType: "",
    guestCount: "",
    eventDate: "",
    message: "",
  });

  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setErrorMsg("");

    // Shared with the server copy of the event so Meta counts one lead, not two.
    const metaEventId = newMetaEventId();
    const metaBrowserIds = getMetaBrowserIds();

    try {
      const res = await fetch("/api/catering", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          guestCount: Number(form.guestCount),
          meta: {
            eventId: metaEventId,
            fbp: metaBrowserIds.fbp,
            fbc: metaBrowserIds.fbc,
          },
        }),
      });

      const data = await res.json();

      if (data.success) {
        setStatus("success");

        // Fired only on a stored inquiry — a validation error or a dropped
        // request is not a lead, and counting it would train Meta on noise.
        trackMeta(
          "Lead",
          {
            content_name: "Catering Inquiry",
            content_category: form.eventType || undefined,
            currency: "USD",
          },
          metaEventId
        );
        setForm({
          name: "",
          email: "",
          phone: "",
          eventType: "",
          guestCount: "",
          eventDate: "",
          message: "",
        });
      } else {
        setStatus("error");
        setErrorMsg(data.message);
      }
    } catch {
      setStatus("error");
      setErrorMsg("Network error. Please check your connection and try again.");
    }
  }

  // Success state
  if (status === "success") {
    return (
      <div className="bg-green-50 border border-green-200 rounded-2xl p-8 text-center">
        <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
        <h3 className="text-2xl font-heading font-bold text-green-800 mb-2">
          Inquiry Submitted!
        </h3>
        <p className="text-green-700 mb-6">
          Thank you! We&apos;ll review your inquiry and get back to you within 24 hours.
        </p>
        <button
          onClick={() => setStatus("idle")}
          className="px-6 py-3 bg-primary text-cream rounded-lg hover:bg-primary-light transition-colors"
        >
          Submit Another Inquiry
        </button>
      </div>
    );
  }

  // Get today's date in YYYY-MM-DD format for min date
  const today = new Date().toISOString().split("T")[0];

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Error banner */}
      {status === "error" && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <p className="text-red-700 text-sm">{errorMsg}</p>
        </div>
      )}

      {/* Two columns on desktop */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Name */}
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-text-main mb-1.5">
            Full Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="name"
            name="name"
            value={form.name}
            onChange={handleChange}
            required
            minLength={2}
            placeholder="John Smith"
            className="w-full px-4 py-3 rounded-lg border border-ink/15 bg-white focus:border-secondary focus:ring-2 focus:ring-secondary/30 outline-none transition-all text-text-main placeholder:text-text-light/60"
          />
        </div>

        {/* Email */}
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-text-main mb-1.5">
            Email <span className="text-red-500">*</span>
          </label>
          <input
            type="email"
            id="email"
            name="email"
            value={form.email}
            onChange={handleChange}
            required
            placeholder="john@example.com"
            className="w-full px-4 py-3 rounded-lg border border-ink/15 bg-white focus:border-secondary focus:ring-2 focus:ring-secondary/30 outline-none transition-all text-text-main placeholder:text-text-light/60"
          />
        </div>

        {/* Phone */}
        <div>
          <label htmlFor="phone" className="block text-sm font-medium text-text-main mb-1.5">
            Phone <span className="text-red-500">*</span>
          </label>
          <input
            type="tel"
            id="phone"
            name="phone"
            value={form.phone}
            onChange={handleChange}
            required
            placeholder="(781) 555-0123"
            className="w-full px-4 py-3 rounded-lg border border-ink/15 bg-white focus:border-secondary focus:ring-2 focus:ring-secondary/30 outline-none transition-all text-text-main placeholder:text-text-light/60"
          />
        </div>

        {/* Event Type */}
        <div>
          <label htmlFor="eventType" className="block text-sm font-medium text-text-main mb-1.5">
            Event Type <span className="text-red-500">*</span>
          </label>
          <select
            id="eventType"
            name="eventType"
            value={form.eventType}
            onChange={handleChange}
            required
            className="w-full px-4 py-3 rounded-lg border border-ink/15 bg-white focus:border-secondary focus:ring-2 focus:ring-secondary/30 outline-none transition-all text-text-main bg-white"
          >
            <option value="">Select event type</option>
            {eventTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>

        {/* Guest Count */}
        <div>
          <label htmlFor="guestCount" className="block text-sm font-medium text-text-main mb-1.5">
            Estimated Guests <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            id="guestCount"
            name="guestCount"
            value={form.guestCount}
            onChange={handleChange}
            required
            min={10}
            max={500}
            placeholder="50"
            className="w-full px-4 py-3 rounded-lg border border-ink/15 bg-white focus:border-secondary focus:ring-2 focus:ring-secondary/30 outline-none transition-all text-text-main placeholder:text-text-light/60"
          />
          <p className="text-xs text-text-light mt-1">Minimum 10 guests</p>
        </div>

        {/* Event Date */}
        <div>
          <label htmlFor="eventDate" className="block text-sm font-medium text-text-main mb-1.5">
            Event Date <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            id="eventDate"
            name="eventDate"
            value={form.eventDate}
            onChange={handleChange}
            required
            min={today}
            className="w-full px-4 py-3 rounded-lg border border-ink/15 bg-white focus:border-secondary focus:ring-2 focus:ring-secondary/30 outline-none transition-all text-text-main"
          />
        </div>
      </div>

      {/* Message (full width) */}
      <div>
        <label htmlFor="message" className="block text-sm font-medium text-text-main mb-1.5">
          Special Requests or Details
        </label>
        <textarea
          id="message"
          name="message"
          value={form.message}
          onChange={handleChange}
          rows={4}
          maxLength={1000}
          placeholder="Tell us about your event, dietary requirements, preferred dishes, etc."
          className="w-full px-4 py-3 rounded-lg border border-ink/15 bg-white focus:border-secondary focus:ring-2 focus:ring-secondary/30 outline-none transition-all text-text-main placeholder:text-text-light/60 resize-y"
        />
        <p className="text-xs text-text-light mt-1 text-right">
          {form.message.length}/1000
        </p>
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={status === "loading"}
        className="w-full flex items-center justify-center gap-2 px-8 py-4 bg-primary text-cream font-semibold rounded-lg hover:bg-primary-light transition-all disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {status === "loading" ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Submitting...
          </>
        ) : (
          <>
            <Send className="w-5 h-5" />
            Submit Inquiry
          </>
        )}
      </button>

      <p className="text-xs text-text-light text-center">
        We&apos;ll respond within 24 hours. Call us at{" "}
        <a href={`tel:${phone}`} className="text-secondary font-medium hover:underline">
          {phoneDisplay}
        </a>{" "}
        for urgent inquiries.
      </p>
    </form>
  );
}