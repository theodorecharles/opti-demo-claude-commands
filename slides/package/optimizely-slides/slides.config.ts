// ===========================================================================
// Optimizely Slides — per-demo configuration.
//
// This is the ONE file you edit to make the deck match the demo it ships
// beside. The demo-builder skill fills it in automatically from the context
// you give when you run /fx-demo or /wx-demo; you (or a follow-up chat with
// Claude) can keep editing it by hand afterwards. Everything below has a
// sensible generic default, so the deck renders correctly even untouched.
//
// The rest of the package reads from `slidesConfig` — you should rarely need
// to touch the component files just to re-brand or re-point the deck.
// ===========================================================================

export type HeroVariation = {
  key: string;
  label: string;
  headline: string;
  subtitle: string;
  cta_label: string;
  bg_color: string;
};

export type SlidesConfig = {
  // --- Optimizely wiring -------------------------------------------------
  /**
   * Feature Experimentation SDK key. Powers the code samples AND the live
   * decide() benchmark. If the host app already wraps the deck in an
   * <OptimizelyProvider>, the benchmark reuses that client; otherwise it
   * creates its own from this key. Leave "" to show a setup hint instead of
   * running the benchmark.
   */
  sdkKey: string;
  /** Flag key used in every decide() example and in the benchmark. */
  flagKey: string;
  /** Web Experimentation snippet/project id — the `.../js/<id>.js` script. */
  wxSnippetId: string;

  // --- Navigation --------------------------------------------------------
  /** Where "Back to the app", "Restart", and the Escape key send the user. */
  homeHref: string;
  /**
   * Route the deck is mounted at (must match the folder the installer created,
   * e.g. app/slides/page.tsx → "/slides"). The Adobe comparison lives at
   * `${deckPath}/adobe-comparison`.
   */
  deckPath: string;

  // --- Brand shown in the Visual Editor mock + hero preview + snippet host -
  brand: {
    /** Display name, e.g. "Acme". */
    name: string;
    /** Wordmark text rendered in the mock header, e.g. "acme". */
    logoText: string;
    /** Brand accent hex — CTAs, avatar, logo tick. */
    accent: string;
    /** Hero background hex used by the mock's control experience. */
    heroBg: string;
    /** Host shown in the mock's URL bar + WX snippet comment. */
    siteHost: string;
    /** Greeting name in the mock, e.g. "Alex Rivera". */
    userName: string;
    /** Avatar initials, e.g. "AR". */
    userInitials: string;
    /** Top-nav links in the mock. */
    nav: string[];
    /** Feature strip: [title, detail] pairs. */
    features: [string, string][];
    /** Product/catalog cards: name, price, optional tag. */
    catalog: { name: string; price: string; tag?: string }[];
  };

  /**
   * Hero variations for the "read a flag's variables" slide + the live
   * preview. The first entry is treated as the control. These also drive the
   * concrete values shown in the decide()/variables code samples.
   */
  heroVariations: HeroVariation[];

  /** User attributes used by the benchmark + shown as a targeting example. */
  benchAttributes: Record<string, unknown>;
};

// ---------------------------------------------------------------------------
// Generic baseline. Replace per demo (the skill does this for you).
// ---------------------------------------------------------------------------
export const slidesConfig: SlidesConfig = {
  sdkKey: "",
  flagKey: "homepage_hero",
  wxSnippetId: "00000000000000",

  homeHref: "/",
  deckPath: "/slides",

  brand: {
    name: "Acme",
    logoText: "acme",
    accent: "#2563eb",
    heroBg: "#0b1220",
    siteHost: "acme.example.com",
    userName: "Alex Rivera",
    userInitials: "AR",
    nav: ["Home", "Products", "Pricing"],
    features: [
      ["Fast setup", "Live in minutes"],
      ["Flexible plans", "Scale as you grow"],
      ["Free shipping", "On every order"],
      ["24/7 support", "We're always on"],
    ],
    catalog: [
      { name: "Starter", price: "$19/mo", tag: "Popular" },
      { name: "Growth", price: "$49/mo" },
      { name: "Scale", price: "$99/mo", tag: "Best value" },
    ],
  },

  heroVariations: [
    {
      key: "on",
      label: "on (control)",
      headline: "Build better, ship faster.",
      subtitle: "Everything your team needs to launch and grow, in one place.",
      cta_label: "Get started",
      bg_color: "#0b1220",
    },
    {
      key: "value",
      label: "value",
      headline: "More power. Less price.",
      subtitle: "Switch today and save on every plan, guaranteed.",
      cta_label: "See pricing",
      bg_color: "#0b3d2e",
    },
    {
      key: "social_proof",
      label: "social_proof",
      headline: "Join 10,000+ teams already onboard.",
      subtitle: "The platform trusted by fast-moving teams everywhere.",
      cta_label: "Start free trial",
      bg_color: "#15151f",
    },
    {
      key: "urgency",
      label: "urgency",
      headline: "Launch week: 30% off annual plans.",
      subtitle: "Offer ends Sunday — lock in your rate before it's gone.",
      cta_label: "Claim the deal",
      bg_color: "#3a1212",
    },
  ],

  benchAttributes: {
    plan: "pro",
    device_type: "desktop",
    logged_in: true,
    loyalty_tier: "gold",
  },
};
