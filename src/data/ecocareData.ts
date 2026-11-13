export interface JourneyPhase {
  id: 'pickup' | 'registration' | 'consultation' | 'home';
  label: string;
  windowLabel: string;
  headline: string;
  summary: string;
  steps: {
    title: string;
    detail: string;
  }[];
  included: string[];
}

export interface PricingPackage {
  number: string;
  id: 'tier1' | 'tier2';
  title: string;
  price: number;
  duration: string;
  subtitle: string;
  description: string;
  includes: string[];
}

export interface AddonItem {
  id: 'wheelchair' | 'fasting_meal';
  title: string;
  price: number;
  description: string;
}

export interface KlangValleyZone {
  zone: string;
  coverageRadius: string;
  hospitals: string[];
  operatingHours: string;
  bookingNotice: string;
}

export interface FaqItem {
  id: string;
  question: string;
  answer: string;
}

export const HERO_HIGHLIGHTS = [
  {
    value: 'RM 100',
    label: 'Basic Care Starting Rate',
    context: 'Door-to-door transport, hospital navigation, up to 4 hours',
  },
  {
    value: '15 km',
    label: 'Serdang Base Radius',
    context: 'Rapid local dispatch to Hospital Serdang, Putrajaya & IOI clinics',
  },
  {
    value: '3 Zones',
    label: 'Klang Valley Hospital Coverage',
    context: 'Serdang/Putrajaya, KL City, and Petaling Jaya/Subang corridors',
  },
  {
    value: '100%',
    label: 'CPR & First-Aid Certified',
    context: 'Trained university student companions based in Serdang',
  },
];

export const JOURNEY_PHASES: JourneyPhase[] = [
  {
    id: 'pickup',
    label: 'Door-to-Door Pickup',
    windowLabel: 'Step 01 · Home Departure',
    headline: 'Punctual doorstep pickup and mobility assistance from home',
    summary:
      'Your assigned EcoCare student companion arrives at the residence 15 minutes early, helps verify appointment slips and MyKad, and assists safely into the car.',
    steps: [
      {
        title: 'Gate-to-Car Mobility Support',
        detail: 'Steady arm-in-arm guidance down porch steps or condo lifts, plus folding wheelchair loading if requested.',
      },
      {
        title: 'Fast-Check Preparation',
        detail: 'Reminder check for IC, referral letter, medication list, and fasting status before leaving home.',
      },
      {
        title: 'WhatsApp Departure Ping',
        detail: 'Working family members receive an immediate WhatsApp message once pickup is complete.',
      },
    ],
    included: [
      '15-minute early arrival buffer at residence',
      'Direct drop-off at main hospital lobby awning',
      'WhatsApp live status update to family',
    ],
  },
  {
    id: 'registration',
    label: 'Navigation & Queueing',
    windowLabel: 'Step 02 · Registration',
    headline: 'Seamless hospital counter registration and queue management',
    summary:
      'Public and private hospitals in the Klang Valley involve multiple blocks, kiosks, and waiting numbers. Your companion handles the queueing while your parent rests seated.',
    steps: [
      {
        title: 'Kiosk & Counter Check-In',
        detail: 'Number ticket collection, GL or appointment card verification, and vitals station guidance.',
      },
      {
        title: 'Multilingual Wayfinding',
        detail: 'Clear communication across hospital counters in English, Bahasa Melayu, and Mandarin.',
      },
      {
        title: 'Seated Queue Standby',
        detail: 'Companion watches the clinic call screen closely so patients never miss their turn.',
      },
    ],
    included: [
      'Full navigation between clinics, labs, and X-ray blocks',
      'Wheelchair pushing across long hospital corridors',
      'Real-time queue progress visible in Live Tracker',
    ],
  },
  {
    id: 'consultation',
    label: 'Consultation & Pharmacy',
    windowLabel: 'Step 03 · Clinic & Rx',
    headline: 'Attentive consultation proxy and pharmacy medication collection',
    summary:
      'On our Premium Proxy Package, your companion enters the consultation room, records doctor instructions clearly, and collects prescribed medicines at the pharmacy counter.',
    steps: [
      {
        title: 'In-Room Consultation Notes (Tier 2)',
        detail: 'Captures diagnosis updates, dosage changes, and next follow-up dates in a structured summary.',
      },
      {
        title: 'Pharmacy Queue & Verification',
        detail: 'Collects prescriptions and double-checks morning/evening dosage labels before leaving.',
      },
      {
        title: 'Post-Blood Test Meal Run (Add-on)',
        detail: 'After fasting blood tests, your companion picks up warm breakfast or light porridge nearby.',
      },
    ],
    included: [
      'Structured medical report summary (Premium Proxy)',
      'Photo updates of next appointment card & prescriptions',
      'Optional +RM 10 post-blood test meal pickup',
    ],
  },
  {
    id: 'home',
    label: 'Safe Return Home',
    windowLabel: 'Step 04 · Drop-Off',
    headline: 'Unhurried return trip and safe handoff inside the home',
    summary:
      'We never leave elderly patients at the condo guardhouse or driveway. Your companion walks them inside, sets down bags and medications, and confirms safe arrival with family.',
    steps: [
      {
        title: 'Doorstep Escort Inside',
        detail: 'Guided walk from vehicle to living room or lift lobby with full medication bag handoff.',
      },
      {
        title: 'Final WhatsApp Wrap-Up',
        detail: 'Family receives a closing confirmation text along with consultation notes and follow-up date.',
      },
      {
        title: 'Live Tracker Completion',
        detail: 'Final timeline node updates to Heading Home and marks the trip safely completed.',
      },
    ],
    included: [
      'Up to 4 hours total coverage included per package',
      'Full medication bag & appointment slip handoff',
      'Direct phone contact with companion at +60 12-345 6789',
    ],
  },
];

export const PRICING_PACKAGES: PricingPackage[] = [
  {
    number: '01.',
    id: 'tier1',
    title: 'Basic Care Package',
    price: 100,
    duration: 'Up to 4 hours',
    subtitle: 'Essential accompaniment & navigation',
    description:
      'Ideal for routine follow-ups, lab draws, and outpatient appointments where your loved one needs reliable transport and physical support navigating the hospital.',
    includes: [
      'Door-to-door transport',
      'Hospital navigation & registration assistance',
      'Basic WhatsApp text updates',
      'Up to 4 hours of dedicated coverage',
    ],
  },
  {
    number: '02.',
    id: 'tier2',
    title: 'Premium Proxy Package',
    price: 150,
    duration: 'Up to 4 hours',
    subtitle: 'Full in-room companion & medical summary',
    description:
      'Designed for working children who cannot take leave but need accurate doctor updates, clear medication notes, and attentive in-room advocacy for their parents.',
    includes: [
      'Everything in Tier 1 (Basic Care Package)',
      'In-room consultation companion',
      'Structured medical report sent to family',
      'Multimedia live updates (photos of slips, Rx & queue)',
    ],
  },
];

export const ADDON_ITEMS: AddonItem[] = [
  {
    id: 'wheelchair',
    title: 'Wheelchair Provision',
    price: 15,
    description:
      'Clean, foldable transport wheelchair brought along by your companion for effortless movement across large hospital campuses.',
  },
  {
    id: 'fasting_meal',
    title: 'Post-blood Test Meal Run',
    price: 10,
    description:
      'Companion picks up a warm breakfast or light meal immediately after fasting blood tests or scans are completed.',
  },
];

export const KLANG_VALLEY_ZONES: KlangValleyZone[] = [
  {
    zone: 'Zone 1: Serdang & Putrajaya',
    coverageRadius: 'Base - 15km Radius',
    hospitals: [
      'Hospital Serdang',
      'Hospital Putrajaya',
      'IOI City Mall Clinics',
    ],
    operatingHours: '06:30 – 19:00 Daily',
    bookingNotice: '12 hours advance notice',
  },
  {
    zone: 'Zone 2: Kuala Lumpur (KL) City',
    coverageRadius: 'Central KL Corridor',
    hospitals: [
      'Hospital Kuala Lumpur (HKL)',
      'Prince Court Medical Centre',
      'Tung Shin Hospital',
    ],
    operatingHours: '06:30 – 19:00 Daily',
    bookingNotice: '24 hours advance notice',
  },
  {
    zone: 'Zone 3: Petaling Jaya & Subang',
    coverageRadius: 'PJ & Subang Jaya Corridor',
    hospitals: [
      'Sunway Medical Centre',
      'University Malaya Medical Centre (UMMC)',
      'Subang Jaya Medical Centre (SJMC)',
    ],
    operatingHours: '06:30 – 19:00 Daily',
    bookingNotice: '24 hours advance notice',
  },
];

export const TESTIMONIALS = [
  {
    id: 'serdang-family',
    quote:
      'My mother had an early morning cardiology check at Hospital Serdang while I was stuck in back-to-back meetings in KL. Mei Ling handled the registration queue, stayed inside the consultation room, and sent me a clear summary of her adjusted medication on WhatsApp.',
    name: 'Jason Lim',
    role: 'Son & Primary Caregiver',
    context: 'Premium Proxy Package · Hospital Serdang',
  },
  {
    id: 'ummc-family',
    quote:
      'Finding parking at UMMC is exhausting for seniors. EcoCare dropped my dad right at the clinic entrance with a wheelchair, waited through his fasting blood draw, and picked up porridge for him right after before sending him safely home.',
    name: 'Nurul Aina',
    role: 'Daughter & Care Coordinator',
    context: 'Basic Care + Wheelchair & Meal Run · UMMC',
  },
];

export const FAQ_ITEMS: FaqItem[] = [
  {
    id: 'overtime-rate',
    question: 'What happens if the hospital wait exceeds 4 hours?',
    answer:
      "Our packages include up to 4 hours of service. Any additional time is charged at a flat rate of RM 25 per hour to cover our escorts' time fairly.",
  },
  {
    id: 'in-room-proxy',
    question: "Do your escorts actually enter the doctor's consultation room?",
    answer:
      "Yes, for the Premium Proxy Package, we act as your physical proxy. We enter the room to record the doctor's advice and compile a structured medical report for you.",
  },
  {
    id: 'medical-emergency',
    question: 'What if there is a medical emergency during the trip?',
    answer:
      'Safety is our priority. All our escorts are CPR and First-Aid certified (St. John Ambulance), and we carry basic first-aid kits in our vehicles.',
  },
];
