// ─── SEO Types ───────────────────────────────────────────
export interface SeoData {
  siteTitle: string;
  siteDescription: string;
  keywords: string[];
  ogImage: string;
  ogType: string;
  canonicalUrl: string;
  twitterHandle: string;
  robots: {
    index: boolean;
    follow: boolean;
  };
}

// ─── Site Config Types ──────────────────────────────────
export interface NavItem {
  label: string;
  href: string;
}

export interface CtaButton {
  label: string;
  href: string;
}

export interface FooterConfig {
  copyright: string;
  tagline: string;
}

export interface SectionConfig {
  id: string;
  title: string;
  order: number;
  enabled: boolean;
}

/**
 * Which homepage sections render. Read by src/app/page.tsx.
 *
 * Deliberately separate from the behaviour flags below: a mistake here hides a
 * band of the homepage, which is obvious and reversible. Nothing in this object
 * may ever gate ordering, checkout, or fulfilment — a flag that can take the
 * restaurant offline is not worth the convenience.
 */
export interface SectionFlags {
  about: boolean;
  gallery: boolean;
  specials: boolean;
  reviews: boolean;
  catering: boolean;
  faq: boolean;
}

export interface FeatureFlags {
  /**
   * Descriptive only — nothing reads these to switch behaviour. Both said
   * `false` for months while online ordering and the catering form were live in
   * production, which is the hazard of config nothing consumes. If you ever wire
   * them up, wire them somewhere that failing closed is safe.
   */
  onlineOrdering: boolean;
  cateringForm: boolean;
  newsletter: boolean;
  cookieConsent: boolean;
  analytics: boolean;
  sections: SectionFlags;
}

export interface ThemeColors {
  primary: string;
  primaryLight: string;
  secondary: string;
  secondaryLight: string;
  accent: string;
  background: string;
  backgroundAlt: string;
  ink: string;
  text: string;
  textLight: string;
  white: string;
}

export interface ThemeFonts {
  heading: string;
  body: string;
}

export interface ThemeConfig {
  colors: ThemeColors;
  fonts: ThemeFonts;
}

export interface SiteConfig {
  navigation: NavItem[];
  ctaButton: CtaButton;
  footer: FooterConfig;
  sections: SectionConfig[];
  features: FeatureFlags;
  theme: ThemeConfig;
}

// ─── Restaurant Types ───────────────────────────────────
export interface Address {
  street: string;
  city: string;
  state: string;
  zip: string;
  full: string;
}

export interface Geo {
  lat: number;
  lng: number;
}

export interface Rating {
  value: number;
  count: number;
  source: string;
}

export interface SocialLinks {
  facebook: string;
  instagram: string;
  yelp: string;
}

export interface Hours {
  [day: string]: string;
}

export interface HeroContent {
  headline: string;
  subheadline: string;
  ctaPrimary: string;
  ctaSecondary: string;
}

export interface HighlightCard {
  icon: string;
  title: string;
  description: string;
}

export interface AboutContent {
  headline: string;
  description: string;
  image?: string;
  highlights: HighlightCard[];
}

export interface Testimonial {
  name: string;
  rating: number;
  text: string;
  source: string;
}

export interface CateringFormField {
  name: string;
  label: string;
  type: string;
  required: boolean;
  options?: string[];
}

export interface CateringMenuItem {
  id: string;
  name: string;
  category: string;
  // Optional because not every item offers both tray sizes.
  priceSmall?: number;
  priceLarge?: number;
  servesSmall?: string;
  servesLarge?: string;
}

export interface CateringContent {
  headline: string;
  description: string;
  banner?: string;          
  eventTypes: string[];
  formFields: CateringFormField[];
  menu: CateringMenuItem[];
  minOrder: number;
  advanceNotice: string;
}

export interface FaqItem {
  question: string;
  answer: string;
}

export interface RestaurantData {
  name: string;
  tagline: string;
  address: Address;
  phone: string;
  phoneDisplay: string;
  email: string;
  hours: Hours;
  social: SocialLinks;
  geo: Geo;
  rating: Rating;
  hero: HeroContent;
  about: AboutContent;
  testimonials: Testimonial[];
  catering: CateringContent;
  faq: FaqItem[];
  serviceAreas: string[];
  gallery: string[];
}

// ─── Menu Types ──────────────────────────────────────────
export interface MenuItem {
  id: string;
  name: string;
  price: number;
  description: string;
  tags: string[];
  badge?: string;
  image: string;
}

export interface MenuCategory {
  id: string;
  name: string;
  description: string;
  banner?: string;
  items: MenuItem[];
}

export interface ChefsSpecial {
  id: string;
  name: string;
  reason: string;
  badge?: string;
}

export interface MenuData {
  banner?: string;   
  categories: MenuCategory[];
  chefsSpecials: ChefsSpecial[];
}