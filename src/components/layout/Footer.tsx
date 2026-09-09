import { Phone, Mail, MapPin } from "lucide-react";
import { getSiteConfig, getRestaurantData } from "@/lib/data";

/**
 * Footer — server component, no interactivity.
 * Restaurant info | quick links + socials | hours, on the ink band.
 */

export default function Footer() {
  const { footer, navigation } = getSiteConfig();
  const { address, phone, phoneDisplay, email, hours, social, name } =
    getRestaurantData();

  const days = [
    "monday", "tuesday", "wednesday", "thursday",
    "friday", "saturday", "sunday",
  ];

  return (
    <footer className="bg-ink text-cream/80">
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-12 px-4 py-16 sm:px-6 md:grid-cols-3 lg:px-8">
        {/* Identity */}
        <div>
          <h3 className="font-heading text-2xl text-cream">{name}</h3>
          <p className="mt-3 max-w-xs text-sm text-cream/60">{footer.tagline}</p>
          <div className="mt-6 space-y-3 text-sm">
            <a href={`tel:${phone}`} className="flex items-center gap-3 hover:text-secondary">
              <Phone className="h-4 w-4 shrink-0" />
              {phoneDisplay}
            </a>
            <a href={`mailto:${email}`} className="flex items-center gap-3 hover:text-secondary">
              <Mail className="h-4 w-4 shrink-0" />
              {email}
            </a>
            <a
              href={`https://maps.google.com/?q=${encodeURIComponent(address.full)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-start gap-3 hover:text-secondary"
            >
              <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
              {address.full}
            </a>
          </div>
        </div>

        {/* Links + socials */}
        <div>
          <h4 className="font-heading text-lg text-cream">Explore</h4>
          <ul className="mt-4 space-y-2 text-sm">
            {navigation.map((item) => (
              <li key={item.href}>
                <a href={item.href} className="hover:text-secondary">
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
          <div className="mt-6 flex items-center gap-3">
            {social.facebook && (
              <a
                href={social.facebook}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Facebook"
                className="rounded-full border border-cream/20 p-2 text-cream/70 transition-colors hover:border-secondary hover:text-secondary"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
              </a>
            )}
            {social.instagram && (
              <a
                href={social.instagram}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                className="rounded-full border border-cream/20 p-2 text-cream/70 transition-colors hover:border-secondary hover:text-secondary"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
                </svg>
              </a>
            )}
          </div>
        </div>

        {/* Hours */}
        <div>
          <h4 className="font-heading text-lg text-cream">Hours</h4>
          <dl className="mt-4 space-y-1.5 text-sm">
            {days.map((day) => (
              <div key={day} className="flex justify-between gap-4">
                <dt className="capitalize text-cream/60">{day}</dt>
                <dd>{hours[day]}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>

      <div className="border-t border-cream/10">
        <p className="mx-auto max-w-6xl px-4 py-6 text-center text-xs text-cream/50 sm:px-6 lg:px-8">
          &copy; {new Date().getFullYear()} {footer.copyright}
        </p>
      </div>
    </footer>
  );
}
