// English copy for the public pages. isiZulu (zu.ts) must have the same shape.
// Plain words only: "share", "payout", "cash out". Never "token", "gas" or "wallet".

const en = {
  langName: "English",
  skip: "Skip to main content",
  testnetShort: "Demo on a test network. No real money.",

  nav: {
    asset: "The mini-grid",
    how: "How it works",
    trust: "Proof",
    risks: "Risks",
    faq: "Questions",
    invest: "Invest",
    menu: "Open menu",
    close: "Close menu",
    language: "Language",
  },

  hero: {
    kicker: ["Soweto", "Community solar", "Owned by neighbours"],
    title: "Own a share of your neighbourhood's solar.",
    titleStrong: "Get paid every month.",
    lead:
      "Neighbours buy small shares in a solar mini-grid that sells power to homes and spaza shops on their street. Each month, the money from that power is paid out to the people who own it.",
    priceFrom: (price: string) => `Shares from ${price} each`,
    invest: "Invest",
    see: "See the mini-grid",
    sideTitle: "Proof, not promises",
    sideBody:
      "A tamper-checked meter signs every reading. Payouts only flow for power the meter has proven was sold, and they pause by themselves if power goes missing.",
  },

  meter: {
    label: "Live meter",
    checking: "Checking the meter…",
    error: "Can't reach the test network right now. Trying again.",
    status: { 0: "OK", 1: "Theft", 2: "Tampered", 3: "Offline" } as Record<number, string>,
    banner: {
      0: (kw: string) => `Meter OK · ${kw} now · payouts active`,
      1: (gap: string) => `Theft detected · ${gap} of the power was not paid for · payouts paused`,
      2: () => "Meter case opened · waiting for an inspection · payouts paused",
      3: (when: string) => `Meter offline since ${when} · payouts paused`,
    },
    noReading: "no reading yet",
    ago: { s: "s ago", m: "min ago", h: "h ago", d: "days ago" } as Record<"s" | "m" | "h" | "d", string>,
    powerNow: "Power now",
    produced: "Made so far",
    sold: "Paid for so far",
    lastGap: "Unpaid in last reading",
    lastReading: "Last signed reading",
    offlineHint:
      "Offline means the meter hasn't sent a reading in the last 2 minutes. In this demo the meter is a simulated device that we switch on for showings.",
  },

  asset: {
    label: "The asset",
    title: "Soweto Block A mini-grid",
    placeholder: "Placeholder site for the demo",
    intro:
      "One rooftop solar system with a battery, wired to the homes and shops around it. They buy the power on prepaid meters, like normal electricity.",
    numbersTitle: "In numbers",
    stats: {
      solar: "Solar panels",
      battery: "Battery",
      cost: "Cost to build, about",
      shares: "Shares in total",
      sold: "Shares sold so far",
      customers: "Homes and spaza shops",
      energy: "Power made each month, about",
    },
    customersValue: "20 + 5",
    illustrationNote: "Illustration, not a photo of the real site",
    ownerLabel: "Who owns it",
    owner: "Solar Share Block A SPV (Pty) Ltd",
    ownerNote:
      "A company set up only to own this one mini-grid (mock company for the demo). Each share is a slice of it. Shareholders must pass an ID check.",
    soldOf: (sold: string, max: string) => `${sold} of ${max} shares sold`,
    readLive: "Read live from the blockchain",
    price: "Price per share",
    priceNote: (usdc: string) => `${usdc} digital dollars (USDC), at R16.50 to the dollar`,
  },

  how: {
    label: "How it works",
    title: "Four steps, about two minutes",
    steps: [
      { title: "Sign up", body: "With your phone number and an ID check. No bank visit.", note: "Phone code and ID check are mocked in the demo" },
      { title: "Buy shares in rand", body: "Choose how many shares. You see the price in rand before you confirm.", note: "Test money only" },
      { title: "The meter proves it", body: "The meter signs each reading, so only power that was really sold can earn money.", note: "Live on the test network" },
      { title: "Get paid monthly", body: "Your share of the month's income lands in the app. Cash out to mobile money.", note: "Cash-out is mocked in the demo" },
    ],
  },

  trust: {
    label: "Why you can trust it",
    title: "Check it yourself",
    intro:
      "Everything that matters is on a public record (a blockchain) that nobody, not even us, can quietly change. Every number below is read live, and every line links to the record.",
    meterTitle: "The meter, right now",
    readingsTitle: "Latest signed readings",
    colWhen: "When",
    colPower: "Power",
    colUnpaid: "Unpaid",
    colProof: "Record",
    view: "View",
    loadingReadings: "Loading readings…",
    noReadings: "No readings found yet.",
    readingsError: "Couldn't load readings. They are on Basescan.",
    docsTitle: "The documents",
    docsIntro:
      "Each document's fingerprint (a SHA-256 hash) is stored on the blockchain. Verify downloads the file, fingerprints it in your browser and compares the two.",
    sample: "Sample document",
    docTitles: {
      SPV_CERTIFICATE: "Company certificate",
      INSTALLATION_CERTIFICATE: "Installation certificate",
      POWER_PURCHASE_AGREEMENT: "Power purchase agreement",
    } as Record<string, string>,
    docAbout: {
      SPV_CERTIFICATE: "Shows the company that owns the mini-grid.",
      INSTALLATION_CERTIFICATE: "Shows the system was installed and signed off.",
      POWER_PURCHASE_AGREEMENT: "The deal with the homes and shops that buy the power.",
    } as Record<string, string>,
    open: "Open PDF",
    verify: "Verify",
    verifying: "Checking…",
    match: "Matches the fingerprint on the blockchain",
    mismatch: "Does not match: this file was changed",
    failed: "Couldn't download the file to check it",
    fileHash: "This file",
    chainHash: "On the blockchain",
    ownFile: "Have a copy? Check your own file",
    ownFileResult: (name: string) => `Your file matches: ${name}`,
    ownFileNone: "Your file doesn't match any of the three documents",
    quote: "Money only follows proof.",
    quoteBody:
      "The operator cannot pay in more income than the meter has proven was sold. So nobody can hide a problem by topping up payouts from somewhere else.",
    contractsTitle: "The four contracts",
    contractsNote: "Source code published and verified on Basescan",
    contracts: {
      SolarShareToken: "Shares and ID-checked owners",
      MeterOracle: "Signed meter readings",
      RevenueDistributor: "Monthly payouts",
      ShareSale: "Buying shares",
    } as Record<string, string>,
  },

  theft: {
    label: "Theft protection",
    title: "If power goes missing, payouts pause by themselves",
    body:
      "Illegal connections are common. The meter compares power made with power paid for on every reading. If more than 15% is missing, the status turns to theft and nobody can claim until it's fixed. Money already paid in stays safe.",
    stat: "20%",
    statLabel: "theft would cut your payout",
    statValue: "almost in half",
    tableTitle: "Power stolen and what it does to payouts",
    rows: [
      { stolen: "None", payout: "Full payout", status: "OK" },
      { stolen: "10%", payout: "23% less", status: "OK" },
      { stolen: "15%", payout: "34% less", status: "OK (on the line)" },
      { stolen: "20%", payout: "46% less", status: "Theft: paused" },
    ],
    source: "From our money model",
    demoTitle: "What you would see",
    demoNormal: "Normal",
    demoTheft: "Theft",
    demoNote: "Demo of the banner. The real one reads the live meter.",
    bannerOk: "Meter OK · payouts active",
    bannerTheft: "Theft detected · 21% of the power was not paid for · payouts paused",
    bannerOkSub: "Everyone can claim their share of this month's income.",
    bannerTheftSub: "Claims resume by themselves once the meter shows the gap has closed.",
  },

  estimate: {
    label: "Estimate, not a promise",
    title: "What you might earn",
    yield: "about 7.7%",
    yieldLabel: "a year, before you get your money back",
    exampleTitle: "Example: a spaza owner buys 20 shares",
    pay: "Pays",
    month: "Gets each month, about",
    year: "Gets each year, about",
    calcLabel: "Number of shares",
    calcPay: "You pay",
    calcMonth: "Each month, about",
    calcYear: "Each year, about",
    note:
      "This is an estimate from our money model, using assumed costs and R16.50 to the dollar. Real payouts go up and down with sunshine, sales and theft.",
    link: "Read the money model",
  },

  risks: {
    label: "Risks in plain words",
    title: "What could go wrong",
    items: [
      { title: "Payouts change", body: "They go up and down with sunshine and with how much power the neighbours buy." },
      { title: "Theft and breakdowns", body: "Stolen power or broken equipment can pause or shrink payouts." },
      { title: "Not a bank account", body: "Your money is not guaranteed. You can get back less than you put in." },
      { title: "Hard to sell", body: "Selling your shares later may be hard, and only to other ID-checked people." },
      { title: "Still a demo", body: "To run for real it needs licensed partners. Today it runs on a test network with no real money." },
    ],
  },

  who: {
    label: "Who it's for",
    title: "Built for the people on the street",
    items: [
      { title: "Neighbours", body: "Own part of the power your street uses, starting with one share." },
      { title: "Spaza shop owners", body: "Your shop buys the power. Now it can also earn from it." },
      { title: "Stokvels and savings groups", body: "Put the group's monthly savings into something local you can see." },
      { title: "Local operators", body: "Raise money for a mini-grid from the people it serves, with every payout on record." },
    ],
  },

  partners: {
    label: "Partners and what's mocked",
    title: "What's real today",
    colWhat: "What",
    colWho: "Who would do it",
    colToday: "In this demo",
    rows: [
      { what: "ID check", who: "Smile ID", today: "Mocked: an approve button" },
      { what: "Cash-out to mobile money", who: "Kotani Pay or Yellow Card", today: "Mocked: a receipt screen" },
      { what: "Prepaid meters", who: "An STS prepaid vendor", today: "Simulated meter (Wokwi), live readings" },
      { what: "Licences", who: "FSCA (money) and NERSA (electricity)", today: "Not licensed: needs partners" },
      { what: "Public record", who: "Base", today: "Live on Base Sepolia, a test network" },
    ],
  },

  faq: {
    label: "Questions",
    title: "Good questions",
    items: [
      { q: "Do I need to know anything about crypto?", a: "No. You sign up with your phone, pay in rand and cash out to mobile money. The blockchain runs in the background as the public record." },
      { q: "How much do I need to start?", a: "One share. At the demo price that is R82.50." },
      { q: "When do I get paid?", a: "Once a month, after the month's power sales are counted and checked against the meter." },
      { q: "What happens if someone steals power?", a: "If more than 15% of the power goes unpaid, payouts pause by themselves until it's fixed. Money already paid in stays safe." },
      { q: "Can I sell my shares?", a: "Yes, but only to another ID-checked person, and finding a buyer may take time." },
      { q: "Is this real money?", a: "Not yet. This demo runs on a test network with test money. Running it for real needs licensed partners." },
    ],
  },

  footer: {
    tagline: "Community solar, owned by neighbours.",
    testnet:
      "Demo on Base Sepolia, a test network. No real money. Site, company and documents are samples.",
    links: "Links",
    code: "Code on GitHub",
    moneyModel: "Money model",
    contracts: "Contracts",
    language: "Language",
    draft: "",
    made: "Built for the Node Engine Hackathon 2026.",
  },

  comingSoon: {
    title: "Sign-up opens here next",
    body: "The next step of the build adds sign-up, the ID check and buying shares in under two minutes.",
    back: "Back to the home page",
  },
};

export default en;
export type Dict = typeof en;
