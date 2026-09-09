import { Phone, Mail, MapPin, Navigation } from "lucide-react";
import { getRestaurantData } from "@/lib/data";
import { joinNatural } from "@/lib/utils";

/**
 * Contact Section
 * - Google Maps embed for the location
 * - Phone, email, address, hours, service areas
 * - Dark band (ink) with a faint lattice
 */

export default function Contact() {
  const { name, address, phone, phoneDisplay, email, hours, geo, serviceAreas } =
    getRestaurantData();

  const days = [
    "monday", "tuesday", "wednesday", "thursday",
    "friday", "saturday", "sunday",
  ];

  return (
    <section
      id="contact"
      className="relative scroll-mt-20 overflow-hidden bg-ink py-20 text-cream md:py-28"
    >
      <div className="jaali pointer-events-none absolute inset-0 opacity-60" />
      <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="mb-14 text-center">
          <p className="eyebrow mb-3 text-secondary">Visit</p>
          <h2 className="font-heading text-4xl text-cream sm:text-5xl">
            Find us in {address.city}
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-12 lg:grid-cols-2">
          {/* Map */}
          <div className="min-h-[340px] overflow-hidden rounded-xl ring-1 ring-cream/15">
            <iframe
              src={`https://www.google.com/maps?q=${geo.lat},${geo.lng}&z=15&output=embed`}
              width="100%"
              height="100%"
              style={{ border: 0, minHeight: "340px" }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title={`${name} location`}
            />
          </div>

          {/* Info */}
          <div className="space-y-7">
            <div className="flex items-start gap-4">
              <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-cream/10 text-secondary">
                <MapPin className="h-5 w-5" />
              </span>
              <div>
                <h3 className="font-heading text-lg text-cream">Address</h3>
                <p className="text-cream/75">{address.full}</p>
                <a
                  href={`https://maps.google.com/?q=${encodeURIComponent(address.full)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1.5 inline-flex items-center gap-1 text-sm font-medium text-secondary hover:text-secondary-light"
                >
                  <Navigation className="h-4 w-4" />
                  Get directions
                </a>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-cream/10 text-secondary">
                <Phone className="h-5 w-5" />
              </span>
              <div>
                <h3 className="font-heading text-lg text-cream">Phone</h3>
                <a href={`tel:${phone}`} className="text-cream/75 hover:text-secondary">
                  {phoneDisplay}
                </a>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-cream/10 text-secondary">
                <Mail className="h-5 w-5" />
              </span>
              <div>
                <h3 className="font-heading text-lg text-cream">Email</h3>
                <a href={`mailto:${email}`} className="text-cream/75 hover:text-secondary">
                  {email}
                </a>
              </div>
            </div>

            <div>
              <h3 className="mb-2 font-heading text-lg text-cream">Hours</h3>
              <dl className="space-y-1">
                {days.map((day) => (
                  <div key={day} className="flex justify-between gap-6 text-sm text-cream/75">
                    <dt className="capitalize">{day}</dt>
                    <dd>{hours[day]}</dd>
                  </div>
                ))}
              </dl>
            </div>

            <div>
              <h3 className="mb-2 font-heading text-lg text-cream">Delivery area</h3>
              <p className="text-sm text-cream/60">
                {address.city} and nearby communities including{" "}
                <span className="text-secondary">{joinNatural(serviceAreas)}</span>.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
