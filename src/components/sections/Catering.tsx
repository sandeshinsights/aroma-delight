import {
  PartyPopper,
  Users,
  Building2,
  Cake,
  CalendarHeart,
  Phone,
  DollarSign,
  Clock3,
  ChefHat,
} from "lucide-react";
import { getRestaurantData } from "@/lib/data";
import { formatPrice } from "@/lib/utils";
import CateringForm from "@/components/CateringForm";
import CateringMenuAccordion from "@/components/CateringMenuAccordion";
import Image from "next/image";

const eventIcons: Record<string, React.ReactNode> = {
  "Weddings & Receptions": <PartyPopper className="h-5 w-5" />,
  "Corporate Events & Meetings": <Building2 className="h-5 w-5" />,
  "Birthday Parties": <Cake className="h-5 w-5" />,
  "Anniversaries": <CalendarHeart className="h-5 w-5" />,
  "Holiday Gatherings": <CalendarHeart className="h-5 w-5" />,
  "Community Events": <Users className="h-5 w-5" />,
};

export default function Catering() {
  const { catering, phone } = getRestaurantData();

  return (
    <section id="catering" className="scroll-mt-20 bg-white py-20 md:py-28">
      <div className="mx-auto max-w-6xl space-y-14 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mx-auto max-w-2xl text-center">
          <p className="eyebrow mb-3">Catering</p>
          <h2 className="font-heading text-4xl text-ink sm:text-5xl">
            {catering.headline}
          </h2>
          <p className="mt-5 text-lg leading-relaxed text-text-light">
            {catering.description}
          </p>
        </div>

        {/* Banner */}
        {catering.banner && (
          <div className="relative aspect-[21/9] w-full overflow-hidden rounded-xl">
            <Image
              src={catering.banner}
              alt={catering.headline || "Catering"}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 1100px"
              loading="lazy"
            />
          </div>
        )}

        {/* Event types */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {catering.eventTypes.map((event) => (
            <div
              key={event}
              className="rounded-lg border border-ink/10 bg-cream p-5 text-center"
            >
              <div className="mx-auto mb-3 inline-flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                {eventIcons[event] || <PartyPopper className="h-5 w-5" />}
              </div>
              <p className="text-sm font-medium text-text-main">{event}</p>
            </div>
          ))}
        </div>

        {/* Menu */}
        {catering.menu.length > 0 && (
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_280px] lg:items-start">
            <CateringMenuAccordion items={catering.menu} />

            <aside className="rounded-xl border border-secondary/30 bg-secondary/10 p-6 lg:sticky lg:top-28">
              <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-full bg-secondary/20 text-secondary">
                <ChefHat className="h-5 w-5" />
              </div>
              <h4 className="font-heading text-lg text-ink">
                Don&apos;t see what you&apos;re looking for?
              </h4>
              <p className="mt-2 text-sm leading-relaxed text-text-light">
                We also prepare dishes beyond what&apos;s listed here — tell
                us what you&apos;d like in the form below and we&apos;ll
                customize the menu for your event.
              </p>
            </aside>
          </div>
        )}

        {/* Terms */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex items-center gap-4 rounded-lg border border-ink/10 bg-cream p-6">
            <DollarSign className="h-7 w-7 shrink-0 text-secondary" />
            <div>
              <h4 className="font-heading text-lg text-ink">Minimum order</h4>
              <p className="text-text-light">{formatPrice(catering.minOrder)}</p>
            </div>
          </div>
          <div className="flex items-center gap-4 rounded-lg border border-ink/10 bg-cream p-6">
            <Clock3 className="h-7 w-7 shrink-0 text-secondary" />
            <div>
              <h4 className="font-heading text-lg text-ink">Advance notice</h4>
              <p className="text-text-light">{catering.advanceNotice}</p>
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="rounded-xl border border-ink/10 bg-cream p-6 md:p-10">
          <div className="mx-auto max-w-2xl">
            <h3 className="text-center font-heading text-2xl text-ink">
              Request a quote
            </h3>
            <p className="mt-2 text-center text-text-light">
              Tell us about your event and we&apos;ll follow up with a custom
              proposal.
            </p>
            <div className="mt-8">
              <CateringForm />
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center">
          <a
            href={`tel:${phone}`}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-7 py-3.5 text-base font-semibold text-cream transition-colors hover:bg-primary-light"
          >
            <Phone className="h-5 w-5" />
            Call to discuss your event
          </a>
        </div>
      </div>
    </section>
  );
}
