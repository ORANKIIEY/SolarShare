"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

export type Language = "en" | "zu" | "st";

export interface Translations {
  appName: string;
  tagline: string;
  investorPortal: string;
  myShares: string;
  onchainData: string;
  operatorConsole: string;
  
  // Asset Page
  blockATitle: string;
  blockASubtitle: string;
  stockPhotoLabel: string;
  sharePriceLabel: string;
  sharesRemainingLabel: string;
  electricitySoldLabel: string;
  monthlyPayoutsLabel: string;
  activeStatus: string;
  
  // Meter Status
  meterOkTitle: string;
  meterOkDesc: string;
  meterTheftTitle: string;
  meterTheftDesc: string;
  meterTamperTitle: string;
  meterTamperDesc: string;
  meterOfflineTitle: string;
  meterOfflineDesc: string;
  incomeProtected: string;
  
  // Buying Calculator
  buySharesTitle: string;
  buySharesDesc: string;
  shareCountLabel: string;
  totalInvestmentLabel: string;
  ownershipPortionLabel: string;
  investNowBtn: string;
  noWalletRequired: string;
  
  // Risks Section
  risksTitle: string;
  risksSubtitle: string;
  riskWeatherTitle: string;
  riskWeatherDesc: string;
  riskTheftTitle: string;
  riskTheftDesc: string;
  riskNotBankTitle: string;
  riskNotBankDesc: string;
  riskSellingTitle: string;
  riskSellingDesc: string;
  
  // Documents
  documentsTitle: string;
  documentsSubtitle: string;
  verifyOnchainBtn: string;
  verifiedBadge: string;
  
  // Investor Dashboard (My Shares)
  welcomeBack: string;
  sharesOwnedLabel: string;
  totalEarnedLabel: string;
  claimableNowLabel: string;
  nextPayoutDateLabel: string;
  claimPayoutBtn: string;
  cashOutMobileMoneyBtn: string;
  payoutHistoryTitle: string;
}

const TRANSLATIONS: Record<Language, Translations> = {
  en: {
    appName: "SolarShare",
    tagline: "Community Solar Co-Ownership",
    investorPortal: "Investor Portal",
    myShares: "My Shares",
    onchainData: "Onchain Data",
    operatorConsole: "Operator Console",
    
    blockATitle: "Block A Community Solar Mini-Grid",
    blockASubtitle: "Gauteng, South Africa • 10 kWp Rooftop System powering 20 Homes & 5 Spaza Shops",
    stockPhotoLabel: "Stock photo — Representative 10 kWp mini-grid installation",
    sharePriceLabel: "Fixed Share Price",
    sharesRemainingLabel: "Shares Remaining",
    electricitySoldLabel: "Electricity Sold (Monthly)",
    monthlyPayoutsLabel: "Last Payout Distributed",
    activeStatus: "Active",
    
    meterOkTitle: "Meter Status: OK",
    meterOkDesc: "All systems normal • Meter seal valid • Payouts active",
    meterTheftTitle: "Theft Detected: Payouts Paused",
    meterTheftDesc: "Unmetered bypass detected • Payouts paused automatically to protect co-owners",
    meterTamperTitle: "Tamper Detected: Meter Enclosure Opened",
    meterTamperDesc: "Physical enclosure switch triggered • Payouts paused pending inspection",
    meterOfflineTitle: "Meter Offline: Awaiting Sync",
    meterOfflineDesc: "Telemetry delay • Payouts paused until next verified reading",
    incomeProtected: "Income Protected",
    
    buySharesTitle: "Buy Shares in Block A",
    buySharesDesc: "Start co-owning from just R100. Pay with EFT, debit card, or mobile money.",
    shareCountLabel: "How many shares do you want?",
    totalInvestmentLabel: "Total Investment:",
    ownershipPortionLabel: "Your mini-grid ownership:",
    investNowBtn: "Invest Now",
    noWalletRequired: "No crypto wallet needed • Setup in under 2 minutes",
    
    risksTitle: "Risks in Plain Words",
    risksSubtitle: "We believe in 100% honesty. Please read these risks before buying shares.",
    riskWeatherTitle: "Sunshine & Weather Changes",
    riskWeatherDesc: "Less sun means less power made and sold. Payouts go up during sunny summer months and lower in rainy winter seasons. Income is never guaranteed.",
    riskTheftTitle: "Theft & Maintenance Costs",
    riskTheftDesc: "If a line is tapped or equipment is damaged, the meter pauses payouts immediately. Fixing broken equipment costs money from system income.",
    riskNotBankTitle: "This is Not a Bank Deposit",
    riskNotBankDesc: "You are co-owning physical solar panels, not putting money in a bank savings account. Panels naturally lose a small amount of efficiency over 20–25 years.",
    riskSellingTitle: "Selling Shares Takes Time",
    riskSellingDesc: "Selling shares back isn't instant yet. You should plan to keep your shares and earn monthly cash-outs as electricity is sold.",
    
    documentsTitle: "Legal Documents & SPV Proof",
    documentsSubtitle: "Every document is cryptographically fingerprinted onchain so you can verify it hasn't been altered.",
    verifyOnchainBtn: "Verify Onchain",
    verifiedBadge: "Verified",
    
    welcomeBack: "Welcome back",
    sharesOwnedLabel: "Shares Owned",
    totalEarnedLabel: "Total Payouts Earned",
    claimableNowLabel: "Claimable Right Now",
    nextPayoutDateLabel: "Next Payout Cycle",
    claimPayoutBtn: "Claim Monthly Payout",
    cashOutMobileMoneyBtn: "Cash Out to Mobile Money",
    payoutHistoryTitle: "Payout & Cash-Out History",
  },
  
  zu: {
    appName: "SolarShare",
    tagline: "Ukuhlanganyela Ugesi Welanga Emphakathini",
    investorPortal: "Ingosi Yabatshalizimali",
    myShares: "Amasheya Ami",
    onchainData: "Umbhalo Womphakathi",
    operatorConsole: "Ikhonsoli Yomphathi",
    
    blockATitle: "Isiteshi Sikagesi Welanga: Block A",
    blockASubtitle: "Gauteng, Ningizimu Afrika • Uhlelo lwe-10 kWp oluphakela amakhaya angama-20 nezitolo ezi-5 zespaza",
    stockPhotoLabel: "Isithombe sesibonelo — Ukufakwa kukagesi welanga we-10 kWp",
    sharePriceLabel: "Inani Lesheya Ngalinye",
    sharesRemainingLabel: "Amasheya Asele",
    electricitySoldLabel: "Ugesi Othengisiwe (Ngenyanga)",
    monthlyPayoutsLabel: "Inkokhelo Yokugcina Ekhishiwe",
    activeStatus: "Iyasebenza",
    
    meterOkTitle: "Isimo Semitha: KULUNGILE (OK)",
    meterOkDesc: "Yonke into ihamba kahle • Isitembu semitha sivumelekile • Izinkokhelo ziyasebenza",
    meterTheftTitle: "Kutholwe Ukwebiwa: Izinkokhelo Zimisiwe",
    meterTheftDesc: "Ugesi ophumayo ungakhokhelwe utholakele • Izinkokhelo zimisiwe ukuvikela imali yabanikazi",
    meterTamperTitle: "Imitha Ivuliwe: Izinkokhelo Zimisiwe",
    meterTamperDesc: "Ibhokisi lemitha livuliwe • Izinkokhelo zimiswe kwaze kwahlolwa ngamehlo",
    meterOfflineTitle: "Imitha Ayikho Emoyeni",
    meterOfflineDesc: "Ulwazi luphuzile • Izinkokhelo zilinde ukufundwa okulandelayo okuqinisekisiwe",
    incomeProtected: "Imali Evikelwe",
    
    buySharesTitle: "Thenga Amasheya e-Block A",
    buySharesDesc: "Qala ukuba umnikazi kusukela ku-R100 nje kuphela. Khokha nge-EFT, ikhadi lasebhange, noma imali kamakhalekhukhwini.",
    shareCountLabel: "Ufuna amasheya amangaki?",
    totalInvestmentLabel: "Isamba Semali:",
    ownershipPortionLabel: "Ingxenye yakho yesiteshi:",
    investNowBtn: "Tshala Imali Manje",
    noWalletRequired: "Asikho isikhwama se-crypto esidingekayo • Kwenzelwe ngaphansi kwemizuzu emi-2",
    
    risksTitle: "Izingozi Ngamazwi Abalulekile Nacacile",
    risksSubtitle: "Sikholelwa ekuthembekeni okugcwele kwe-100%. Sicela ufunde lezi zingozi ngaphambi kokuthenga amasheya.",
    riskWeatherTitle: "Ukuguquka Kwelanga Nesimo Sezulu",
    riskWeatherDesc: "Ilanga elincane lisho amandla amancane enziwe futhi athengiswayo. Izinkokhelo ziyenyuka ehlobo elinelanga bese zehla ebusika obunemvula. Imali ayisiqinisekiso.",
    riskTheftTitle: "Ukwebiwa Nezindleko Zokulungisa",
    riskTheftDesc: "Uma intambo iphambaniswa noma impahla yonakaliswa, imitha imisa izinkokhelo ngokushesha. Ukulungisa kubiza imali ephuma kuleyo etholwe kagesi.",
    riskNotBankTitle: "Leli Akusona Isikhwama Sebhange",
    riskNotBankDesc: "Uhlanganyela ubunikazi bamaphaneli elanga angempela, awufaki imali ebhange eliqinisekisa inzalo. Amaphaneli alahlekelwa amandla kancane kancane eminyakeni engama-20 kuya kwengama-25.",
    riskSellingTitle: "Ukudayisa Amasheya Kuthatha Isikhathi",
    riskSellingDesc: "Ukudayisa amasheya akusheshi okwamanje. Kufanele uhlele ukuwagcina futhi uzuze izinkokhelo zanyanga zonke njengoba ugesi uthengiswa.",
    
    documentsTitle: "Amadokhumenti Omthetho Nobufakazi be-SPV",
    documentsSubtitle: "Idokhumenti ngayinye inesitembu sedijithali encwadini yomphakathi ukuze uqinisekise ukuthi ayishintshwanga.",
    verifyOnchainBtn: "Qinisekisa Encwadini",
    verifiedBadge: "Iqinisekisiwe",
    
    welcomeBack: "Siyakwamukela futhi",
    sharesOwnedLabel: "Amasheya Onawo",
    totalEarnedLabel: "Isamba Sezinkokhelo Ezitholiwe",
    claimableNowLabel: "Ongakukhipha Manje",
    nextPayoutDateLabel: "Usuku Lwenkokhelo Olulandelayo",
    claimPayoutBtn: "Thola Inkokhelo Yenyanga",
    cashOutMobileMoneyBtn: "Khiphela Imali ku-Mobile Money",
    payoutHistoryTitle: "Umlando Wezinkokhelo Nokukhipha Imali",
  },
  
  st: {
    appName: "SolarShare",
    tagline: "Kopanelo ea Motlakase oa Letsatsi Sechabeng",
    investorPortal: "Sebaka sa Babeeletsi",
    myShares: "Liabo tsa Ka",
    onchainData: "Buka ea Sechaba",
    operatorConsole: "Sebaka sa Tsamaiso",
    
    blockATitle: "Setsi sa Motlakase oa Letsatsi: Block A",
    blockASubtitle: "Gauteng, Afrika Boroa • Sistimi ea 10 kWp e fang matlo a 20 le mabenkele a 5 a spaza motlakase",
    stockPhotoLabel: "Setšoantšo sa mohlala — Kaho ea motlakase oa letsatsi ea 10 kWp",
    sharePriceLabel: "Theko ea Kabelo ka 'Ngoe",
    sharesRemainingLabel: "Liabo tse Setseng",
    electricitySoldLabel: "Motlakase o Rekisitsoeng (Kgwedi)",
    monthlyPayoutsLabel: "Tefo ea Morao-rao e Abiloeng",
    activeStatus: "E ea sebetsa",
    
    meterOkTitle: "Boemo ba Metara: HO LOKILE (OK)",
    meterOkDesc: "Tsohle li tsamaea hantle • Setempe sa metara se nepahetse • Litefo li ea sebetsa",
    meterTheftTitle: "Bosholu bo Fumanoe: Litefo li Emisitsoe",
    meterTheftDesc: "Motlakase o tsoang o sa lefelloang o lemohuoe • Litefo li emisitsoe ho sireletsa chelete ea beng ba liabo",
    meterTamperTitle: "Metara e Butsoe: Litefo li Emisitsoe",
    meterTamperDesc: "Lebokose la metara le butsoe • Litefo li emisitsoe ho fihlela ha le hlahlojoa",
    meterOfflineTitle: "Metara ha e eo Marang-rang",
    meterOfflineDesc: "Tlhahisoleseling e liehile • Litefo li emetse phuputso e netefalitsoeng e latelang",
    incomeProtected: "Chelete e Sirelelitsoeng",
    
    buySharesTitle: "Reka Liabo ho Block A",
    buySharesDesc: "Qala ho ba mong'a kabelo ho tloha ho R100 feela. Lefe ka EFT, karete ea banka kapa mobile money.",
    shareCountLabel: "U batla liabo tse kae?",
    totalInvestmentLabel: "Kakaretso ea Peeletso:",
    ownershipPortionLabel: "Kabelo ea hau ea setsi:",
    investNowBtn: "Beeletsa Hona Joale",
    noWalletRequired: "Ha ho hlokahale wallet ea crypto • E qeta ka tlase ho metsotso e 2",
    
    risksTitle: "Likotsi ka Mantsoe a Hlakileng",
    risksSubtitle: "Re lumela ho tšepahala ka 100%. Ka kopo bala likotsi tsena pele u reka liabo.",
    riskWeatherTitle: "Liphetoho tsa Letsatsi le Boemo ba Leholimo",
    riskWeatherDesc: "Letsatsi le fokolang le bolela motlakase o fokolang o hlahisoang le ho rekisoa. Litefo li nyoloha hlabula ha ho le letsatsi, li theoha mariha ha pula e na. Chelete ha e ea tiisetsoa.",
    riskTheftTitle: "Bosholu le Litšenyehelo tsa Tokiso",
    riskTheftDesc: "Haeba khoele e thijoa kapa thepa e senyeha, metara e emisa litefo hang-hang. Ho lokisa thepa ho ja chelete e tsoang thekisong ea motlakase.",
    riskNotBankTitle: "Sena ha se Ak'haonte ea Banka",
    riskNotBankDesc: "U arolelana le beng ba bang ba liphanele tsa 'nete, ha u bee chelete bankeng e u fang phaello e tiisitsoeng. Liphanele li lahleheloa ke matla butle-butle ka lilemo tse 20 ho isa ho tse 25.",
    riskSellingTitle: "Ho Rekisa Liabo ho Nka Nako",
    riskSellingDesc: "Ho rekisa liabo ha ho etsahale hang-hang hona joale. U lokela ho rera ho boloka liabo tsa hau le ho fumana litefo tsa khoeli le khoeli ha motlakase o rekisoa.",
    
    documentsTitle: "Litokomane tsa Molao le Bopaki ba SPV",
    documentsSubtitle: "Tokomane e 'ngoe le e 'ngoe e ngotsoe bukeng ea sechaba ea digital e le hore u ka netefatsa hore ha ea fetoloa.",
    verifyOnchainBtn: "Netefatsa Bukeng",
    verifiedBadge: "E Netefalitsoe",
    
    welcomeBack: "Rea u amohela hape",
    sharesOwnedLabel: "Liabo tseo u nang le Tsona",
    totalEarnedLabel: "Kakaretso ea Litefo tse Fumanoeng",
    claimableNowLabel: "Tse ka Huloang Hona Joale",
    nextPayoutDateLabel: "Letsatsi le Latelang la Tefo",
    claimPayoutBtn: "Hula Tefo ea Khoeli",
    cashOutMobileMoneyBtn: "Ntša Chelete ho Mobile Money",
    payoutHistoryTitle: "Nalane ea Litefo le ho Ntša Chelete",
  },
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: Translations;
}

const LanguageContext = createContext<LanguageContextType>({
  language: "en",
  setLanguage: () => {},
  t: TRANSLATIONS.en,
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>("en");

  useEffect(() => {
    try {
      const saved = localStorage.getItem("solarshare_lang") as Language;
      if (saved && (saved === "en" || saved === "zu" || saved === "st")) {
        setLanguageState(saved);
      }
    } catch {
      // ignore
    }
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    try {
      localStorage.setItem("solarshare_lang", lang);
    } catch {
      // ignore
    }
  };

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage,
        t: TRANSLATIONS[language] || TRANSLATIONS.en,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
