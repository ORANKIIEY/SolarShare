// isiZulu copy. DRAFT: written for the demo and still to be checked by a
// first-language speaker. Same shape as en.ts (TypeScript enforces it).
import type { Dict } from "./en";

const zu: Dict = {
  langName: "isiZulu",
  skip: "Yeqa uye kokuqukethwe",
  testnetShort: "Umbukiso kunethiwekhi yokuhlola. Ayikho imali yangempela.",

  nav: {
    asset: "Igridi encane",
    how: "Isebenza kanjani",
    trust: "Ubufakazi",
    risks: "Izingozi",
    faq: "Imibuzo",
    invest: "Tshala imali",
    menu: "Vula imenyu",
    close: "Vala imenyu",
    language: "Ulimi",
  },

  hero: {
    kicker: ["ESoweto", "Ilanga lomphakathi", "Lingabomakhelwane"],
    title: "Yiba nesabelo kugesi welanga wendawo yakini.",
    titleStrong: "Holela inyanga nenyanga.",
    lead:
      "Omakhelwane bathenga izabelo ezincane kugridi encane yelanga ethengisela ugesi imizi nezitolo zesipaza zasemgwaqweni wabo. Inyanga ngayinye, imali yalowo gesi ikhokhelwa abantu abangabanikazi bayo.",
    priceFrom: (price: string) => `Izabelo kusuka ku-${price} isabelo`,
    invest: "Tshala imali",
    see: "Bona igridi encane",
    sideTitle: "Ubufakazi, hhayi izithembiso",
    sideBody:
      "Imitha ehlolwayo ukuthi akekho oyiphazamisile isayina konke ekufundayo. Izinkokhelo zihamba kuphela ngogesi imitha efakazele ukuthi uthengisiwe, futhi ziyema zodwa uma ugesi ulahleka.",
  },

  meter: {
    label: "Imitha ebukhoma",
    checking: "Sihlola imitha…",
    error: "Ayitholakali inethiwekhi yokuhlola okwamanje. Sizozama futhi.",
    status: { 0: "Kulungile", 1: "Ukwebiwa", 2: "Iphazanyisiwe", 3: "Ayixhunyiwe" },
    banner: {
      0: (kw: string) => `Imitha ilungile · ${kw} manje · izinkokhelo ziyaqhubeka`,
      1: (gap: string) => `Kutholakale ukwebiwa · u-${gap} wogesi akakhokhelwanga · izinkokhelo zimisiwe`,
      2: () => "Ibhokisi lemitha livuliwe · silinde ukuhlolwa · izinkokhelo zimisiwe",
      3: (when: string) => `Imitha ayixhunyiwe kusukela ngo-${when} · izinkokhelo zimisiwe`,
    },
    noReading: "akukafundwa lutho",
    ago: { s: "imizuzwana edlule", m: "imizuzu edlule", h: "amahora adlule", d: "izinsuku ezedlule" },
    powerNow: "Amandla manje",
    produced: "Okwenziwe kuze kube manje",
    sold: "Okukhokhelwe kuze kube manje",
    lastGap: "Okungakhokhelwanga ekufundeni kokugcina",
    lastReading: "Ukufunda kokugcina okusayiniwe",
    offlineHint:
      "Ayixhunyiwe kusho ukuthi imitha ayithumelanga lutho emizuzwini emi-2 edlule. Kulo mbukiso imitha iyidivayisi elingisayo esiyivula uma sibonisa.",
  },

  asset: {
    label: "Impahla",
    title: "Igridi encane yase-Soweto Block A",
    placeholder: "Indawo yesibonelo yombukiso",
    intro:
      "Uhlelo olulodwa lwelanga phezu kophahla olunebhethri, oluxhunywe emizini nasezitolo eziluzungezile. Bathenga ugesi ngamamitha e-prepaid, njengogesi ojwayelekile.",
    numbersTitle: "Ngezinombolo",
    stats: {
      solar: "Amaphaneli elanga",
      battery: "Ibhethri",
      cost: "Izindleko zokwakha, cishe",
      shares: "Izabelo zizonke",
      sold: "Izabelo esezithengiwe",
      customers: "Imizi nezitolo zesipaza",
      energy: "Ugesi owenziwa nyanga zonke, cishe",
    },
    customersValue: "20 + 5",
    illustrationNote: "Umdwebo, akusona isithombe sendawo yangempela",
    ownerLabel: "Ubani umnikazi",
    owner: "Solar Share Block A SPV (Pty) Ltd",
    ownerNote:
      "Inkampani eyasungulelwa ukuba ngumnikazi wale gridi encane kuphela (inkampani yesibonelo yombukiso). Isabelo ngasinye siyingxenye yayo. Abanikazi bezabelo kumele baphase ukuhlolwa kukamazisi.",
    soldOf: (sold: string, max: string) => `Kuthengiwe izabelo ezingu-${sold} kwezingu-${max}`,
    readLive: "Kufundwa bukhoma ku-blockchain",
    price: "Intengo yesabelo",
    priceNote: (usdc: string) => `Amadola edijithali angu-${usdc} (USDC), ku-R16.50 idola`,
  },

  how: {
    label: "Isebenza kanjani",
    title: "Izinyathelo ezine, cishe imizuzu emibili",
    steps: [
      { title: "Bhalisa", body: "Ngenombolo yakho yocingo nokuhlolwa kukamazisi. Akudingeki uye ebhange.", note: "Ikhodi yocingo nokuhlolwa kukamazisi kuyalingiswa kulo mbukiso" },
      { title: "Thenga izabelo ngama-rand", body: "Khetha ukuthi zingaki. Ubona intengo ngama-rand ngaphambi kokuqinisekisa.", note: "Imali yokuhlola kuphela" },
      { title: "Imitha iyafakazela", body: "Imitha isayina konke ekufundayo, ngakho ugesi othengiswe ngempela kuphela ongenza imali.", note: "Kubukhoma kunethiwekhi yokuhlola" },
      { title: "Holela nyanga zonke", body: "Ingxenye yakho yemali yenyanga ifika ku-app. Yikhiphe uyifake ku-mobile money.", note: "Ukukhipha imali kuyalingiswa kulo mbukiso" },
    ],
  },

  trust: {
    label: "Kungani ungakwethemba",
    title: "Zibonele wena",
    intro:
      "Konke okubalulekile kusemqulwini womphakathi (i-blockchain) okungekho muntu, ngisho nathi, ongawushintsha ngasese. Zonke izinombolo ezingezansi zifundwa bukhoma, futhi umugqa ngamunye uxhumene nomqulu.",
    meterTitle: "Imitha, njengamanje",
    readingsTitle: "Ukufunda kwakamuva okusayiniwe",
    colWhen: "Nini",
    colPower: "Amandla",
    colUnpaid: "Akukhokhelwe",
    colProof: "Umqulu",
    view: "Buka",
    loadingReadings: "Silayisha ukufunda…",
    noReadings: "Akukatholakali ukufunda.",
    readingsError: "Asikwazanga ukulayisha ukufunda. Kutholakala ku-Basescan.",
    docsTitle: "Imibhalo",
    docsIntro:
      "Isigxivizo somunwe sombhalo ngamunye (i-SHA-256 hash) sigcinwe ku-blockchain. Qinisekisa kulanda ifayela, kwenze isigxivizo sayo kusiphequluli sakho bese kuqhathanisa kokubili.",
    sample: "Umbhalo wesibonelo",
    docTitles: {
      SPV_CERTIFICATE: "Isitifiketi senkampani",
      INSTALLATION_CERTIFICATE: "Isitifiketi sokufaka",
      POWER_PURCHASE_AGREEMENT: "Isivumelwano sokuthenga ugesi",
    },
    docAbout: {
      SPV_CERTIFICATE: "Kubonisa inkampani engumnikazi wegridi encane.",
      INSTALLATION_CERTIFICATE: "Kubonisa ukuthi uhlelo lufakiwe futhi lwavunywa.",
      POWER_PURCHASE_AGREEMENT: "Isivumelwano nemizi nezitolo ezithenga ugesi.",
    },
    open: "Vula i-PDF",
    verify: "Qinisekisa",
    verifying: "Siyahlola…",
    match: "Kufana nesigxivizo esiku-blockchain",
    mismatch: "Akufani: leli fayela lishintshiwe",
    failed: "Asikwazanga ukulanda ifayela ukuze silihlole",
    fileHash: "Leli fayela",
    chainHash: "Ku-blockchain",
    ownFile: "Unekhophi? Hlola elakho ifayela",
    ownFileResult: (name: string) => `Ifayela lakho liyafana: ${name}`,
    ownFileNone: "Ifayela lakho alifani nanoma yimuphi wemibhalo emithathu",
    quote: "Imali ilandela ubufakazi kuphela.",
    quoteBody:
      "Umphathi akakwazi ukufaka imali engenayo engaphezu kwaleyo imitha efakazele ukuthi ithengisiwe. Ngakho akekho ongafihla inkinga ngokwengeza izinkokhelo ngemali evela kwenye indawo.",
    contractsTitle: "Izinkontileka ezine",
    contractsNote: "Ikhodi yomthombo ishicilelwe futhi yaqinisekiswa ku-Basescan",
    contracts: {
      SolarShareToken: "Izabelo nabanikazi abahloliwe",
      MeterOracle: "Ukufunda kwemitha okusayiniwe",
      RevenueDistributor: "Izinkokhelo zanyanga zonke",
      ShareSale: "Ukuthenga izabelo",
    },
  },

  theft: {
    label: "Ukuvikela ukwebiwa",
    title: "Uma ugesi ulahleka, izinkokhelo ziyema zodwa",
    body:
      "Ukuxhumana ngokungemthetho kuvamile. Imitha iqhathanisa ugesi owenziwe nogesi okhokhelwe kukho konke ukufunda. Uma kungaphezu kuka-15% okulahlekile, isimo siba ngukwebiwa futhi akekho ongathatha imali aze alungiswe. Imali esivele ikhokhiwe ihlala iphephile.",
    stat: "20%",
    statLabel: "wokwebiwa ungasika inkokhelo yakho",
    statValue: "cishe ngesigamu",
    tableTitle: "Ugesi owebiwe nokuthi wenzani ezinkokhelweni",
    rows: [
      { stolen: "Lutho", payout: "Inkokhelo egcwele", status: "Kulungile" },
      { stolen: "10%", payout: "23% ngaphansi", status: "Kulungile" },
      { stolen: "15%", payout: "34% ngaphansi", status: "Kulungile (emngceleni)" },
      { stolen: "20%", payout: "46% ngaphansi", status: "Ukwebiwa: kumisiwe" },
    ],
    source: "Kusuka kumodeli yethu yemali",
    demoTitle: "Obungakubona",
    demoNormal: "Okujwayelekile",
    demoTheft: "Ukwebiwa",
    demoNote: "Umbukiso wesibhengezo. Esangempela sifunda imitha ebukhoma.",
    bannerOk: "Imitha ilungile · izinkokhelo ziyaqhubeka",
    bannerTheft: "Kutholakale ukwebiwa · u-21% wogesi akakhokhelwanga · izinkokhelo zimisiwe",
    bannerOkSub: "Wonke umuntu angathatha ingxenye yakhe yemali yale nyanga.",
    bannerTheftSub: "Ukuthatha imali kuqala futhi kodwa uma imitha ibonisa ukuthi igebe livaliwe.",
  },

  estimate: {
    label: "Isilinganiso, hhayi isithembiso",
    title: "Ongakuhola",
    yield: "cishe u-7.7%",
    yieldLabel: "ngonyaka, ngaphambi kokuthi imali yakho ibuye",
    exampleTitle: "Isibonelo: umnikazi wesipaza uthenga izabelo ezingu-20",
    pay: "Ukhokha",
    month: "Uthola nyanga zonke, cishe",
    year: "Uthola unyaka nonyaka, cishe",
    calcLabel: "Inani lezabelo",
    calcPay: "Ukhokha",
    calcMonth: "Nyanga zonke, cishe",
    calcYear: "Unyaka nonyaka, cishe",
    note:
      "Lesi yisilinganiso esivela kumodeli yethu yemali, sisebenzisa izindleko esizicabangelayo kanye no-R16.50 idola. Izinkokhelo zangempela ziyenyuka zehle ngokwelanga, ngokuthengiswayo nangokwebiwa.",
    link: "Funda imodeli yemali (ngesiNgisi)",
  },

  risks: {
    label: "Izingozi ngamazwi alula",
    title: "Okungahamba kabi",
    items: [
      { title: "Izinkokhelo ziyashintsha", body: "Ziyenyuka zehle ngokwelanga nangokuthi omakhelwane bathenga ugesi ongakanani." },
      { title: "Ukwebiwa nokuphuka", body: "Ugesi owebiwe noma imishini ephukile kungamisa noma kunciphise izinkokhelo." },
      { title: "Akuyona i-akhawunti yasebhange", body: "Imali yakho ayiqinisekisiwe. Ungabuyiselwa okungaphansi kwalokho okufakile." },
      { title: "Kunzima ukuthengisa", body: "Ukuthengisa izabelo zakho kamuva kungaba nzima, futhi kuphela kubantu abahloliwe." },
      { title: "Kusewumbukiso", body: "Ukuze kusebenze ngempela kudinga ozakwethu abanamalayisense. Namuhla kusebenza kunethiwekhi yokuhlola ngaphandle kwemali yangempela." },
    ],
  },

  who: {
    label: "Okwabani",
    title: "Kwakhelwe abantu basemgwaqweni",
    items: [
      { title: "Omakhelwane", body: "Yiba ngumnikazi wengxenye kagesi osetshenziswa umgwaqo wakho, uqale ngesabelo esisodwa." },
      { title: "Abanikazi bezitolo zesipaza", body: "Isitolo sakho sithenga ugesi. Manje singaphinde sihole kuwo." },
      { title: "Ama-stokvel namaqembu okonga", body: "Faka imali eyongwa yiqembu nyanga zonke entweni yasekhaya oyibonayo." },
      { title: "Abaphathi bendawo", body: "Qoqa imali yegridi encane kubantu ebasizayo, yonke inkokhelo ibhaliwe." },
    ],
  },

  partners: {
    label: "Ozakwethu nokulingiswayo",
    title: "Okungokoqobo namuhla",
    colWhat: "Yini",
    colWho: "Ubani ongakwenza",
    colToday: "Kulo mbukiso",
    rows: [
      { what: "Ukuhlolwa kukamazisi", who: "Smile ID", today: "Kuyalingiswa: inkinobho yokuvuma" },
      { what: "Ukukhipha imali ku-mobile money", who: "Kotani Pay noma Yellow Card", today: "Kuyalingiswa: isikrini serisidi" },
      { what: "Amamitha e-prepaid", who: "Umthengisi we-STS prepaid", today: "Imitha elingisayo (Wokwi), ukufunda bukhoma" },
      { what: "Amalayisense", who: "I-FSCA (imali) ne-NERSA (ugesi)", today: "Akunalayisense: kudinga ozakwethu" },
      { what: "Umqulu womphakathi", who: "I-Base", today: "Bukhoma ku-Base Sepolia, inethiwekhi yokuhlola" },
    ],
  },

  faq: {
    label: "Imibuzo",
    title: "Imibuzo emihle",
    items: [
      { q: "Ngabe kudingeka ngazi okuthile nge-crypto?", a: "Cha. Ubhalisa ngocingo lwakho, ukhokhe ngama-rand bese ukhipha imali ku-mobile money. I-blockchain isebenza ngemuva njengomqulu womphakathi." },
      { q: "Ngidinga malini ukuze ngiqale?", a: "Isabelo esisodwa. Ngentengo yombukiso lokho kungu-R82.50." },
      { q: "Ngiholelwa nini?", a: "Kanye ngenyanga, ngemuva kokuba ukuthengiswa kukagesi kwenyanga kubaliwe futhi kwaqhathaniswa nemitha." },
      { q: "Kwenzekani uma othile entshontsha ugesi?", a: "Uma ugesi ongaphezu kuka-15% ungakhokhelwa, izinkokhelo ziyema zodwa kuze kulungiswe. Imali esivele ikhokhiwe ihlala iphephile." },
      { q: "Ngingazithengisa izabelo zami?", a: "Yebo, kodwa kuphela komunye umuntu ohloliwe, futhi ukuthola umthengi kungathatha isikhathi." },
      { q: "Ingabe le yimali yangempela?", a: "Okwamanje cha. Lo mbukiso usebenza kunethiwekhi yokuhlola ngemali yokuhlola. Ukuwuqhuba ngempela kudinga ozakwethu abanamalayisense." },
    ],
  },

  footer: {
    tagline: "Ilanga lomphakathi, elingelomakhelwane.",
    testnet:
      "Umbukiso ku-Base Sepolia, inethiwekhi yokuhlola. Ayikho imali yangempela. Indawo, inkampani nemibhalo kuyizibonelo.",
    links: "Izixhumanisi",
    code: "Ikhodi ku-GitHub",
    moneyModel: "Imodeli yemali",
    contracts: "Izinkontileka",
    language: "Ulimi",
    draft: "Ukuhumusha kwesiZulu kuseyisalukiso, kusazohlolwa ngokhuluma ulimi lwakhe.",
    made: "Kwakhelwe i-Node Engine Hackathon 2026.",
  },

  comingSoon: {
    title: "Ukubhalisa kuvula lapha ngokulandelayo",
    body: "Isinyathelo esilandelayo sokwakha sengeza ukubhalisa, ukuhlolwa kukamazisi nokuthenga izabelo ngaphansi kwemizuzu emibili.",
    back: "Buyela ekhasini lasekhaya",
  },
};

export default zu;
