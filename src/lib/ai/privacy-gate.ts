/**
 * Server-side privacy-poort vóór ELKE tekst die naar het AI-model gaat, voor
 * de gedeelde AI-assistlaag (src/app/api/ai/assist/route.ts). Blokkeert vóór
 * verzending, niet erna: niets van de gevonden invoer wordt naar Vertex AI
 * gestuurd. De aanroeper verstuurt de GENORMALISEERDE tekst naar het model,
 * niet de ruwe invoer: zo kan een omzeiling die de gate passeert via een
 * rariteit (zero-width, homoglyph) het model ook niet meer bereiken.
 *
 * Bewust regel-gebaseerd en niet een AI-classifier, zelfde reden als
 * avg-guardrails.ts: een blokkade moet uitlegbaar en getest zijn, niet zelf
 * weer een modelbeslissing.
 *
 * Voornamen: exacte tokens na normalisatie tegen een vaste lijst veelvoorkomende
 * Nederlandse voornamen. Dat is geen leerlingenbestand. Een zeldzame naam kan
 * erdoorheen; initialen zoals L.J. blijven toegestaan.
 */

import { NEDERLANDSE_VOORNAMEN } from "./nederlandse-voornamen";

export interface PrivacyGateResultaat {
  ok: boolean;
  redenen: string[];
  /** Genormaliseerde tekst: dit is wat verzonden mag worden, nooit de ruwe invoer. */
  genormaliseerd: string;
}

/** Homoglyphs die vaak gebruikt worden om een filter te omzeilen: Cyrillisch/Grieks naar Latijn. */
const HOMOGLYFEN: Record<string, string> = {
  // Cyrillisch
  "а": "a", "А": "A", "е": "e", "Е": "E", "о": "o", "О": "O",
  "р": "p", "Р": "P", "с": "c", "С": "C", "х": "x", "Х": "X",
  "у": "y", "У": "Y", "і": "i", "І": "I", "ѕ": "s", "Ѕ": "S",
  "к": "k", "К": "K", "м": "m", "М": "M", "н": "h", "Н": "H",
  "в": "b", "В": "B", "т": "t", "Т": "T",
  // Grieks
  "α": "a", "Α": "A", "ο": "o", "Ο": "O", "ρ": "p", "Ρ": "P",
  "τ": "t", "Τ": "T", "υ": "y", "Υ": "Y", "ν": "v", "Ν": "N",
  "ι": "i", "Ι": "I", "κ": "k", "Κ": "K", "χ": "x", "Χ": "X",
  "β": "b", "Β": "B", "η": "n", "Η": "H",
};
const HOMOGLYFEN_REGEX = new RegExp(Object.keys(HOMOGLYFEN).join("|"), "g");

/**
 * Normaliseert tekst vóór elke controle: NFKC, zero-width/format-tekens weg,
 * elke Unicode-spatie naar een gewone spatie, gangbare homoglyphs naar
 * Latijn, controletekens weg. Dit is ook de tekst die verzonden wordt: een
 * omzeiling die alleen op de weergave werkt (bijv. een zero-width character
 * tussen letters) verdwijnt hier voorgoed, in plaats van dat hij de gate
 * passeert en alsnog bij het model belandt.
 */
export function normaliseerTekst(tekst: string): string {
  return tekst
    .normalize("NFKC")
    .replace(/\p{Cf}/gu, "")
    .replace(/\p{Zs}/gu, " ")
    .replace(HOMOGLYFEN_REGEX, (char) => HOMOGLYFEN[char] ?? char)
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .replace(/[ \t]+/g, " ")
    .trim();
}

/**
 * Verwijdert spaties, punten, streepjes en underscores die tussen losse
 * letters/cijfers staan, zodat een uit elkaar getrokken woord ("d y s l e x
 * i e", "06 12 34 56 78") alsnog als aaneengesloten term herkend wordt. Dit
 * is een aparte, "gecomprimeerde" variant naast de genormaliseerde tekst,
 * puur voor detectie: er wordt niets van verzonden.
 */
export function comprimeerVoorDetectie(tekst: string): string {
  let vorige: string;
  let huidige = tekst.toLowerCase();
  do {
    vorige = huidige;
    huidige = huidige.replace(/([\p{L}\p{N}])[ \t.\-_]+(?=[\p{L}\p{N}])/gu, "$1");
  } while (huidige !== vorige);
  return huidige;
}

const MEDISCHE_TERMEN = new RegExp(
  "\\b(adhd|add|dyslecti(?:sch|e|es)?|dyslexie|dyscalculie|autis(?:me|t|tisch|tische)|" +
    "diagnose|gediagnosticeerd|medicatie|depressi(?:e|ef)|angststoornis|trauma|ptss|" +
    "hoogsensitie(?:f|ve)|hoogbegaafd(?:heid)?|psycholoog|psychiater|therapie|rugzak|" +
    "pgb|zorgplan|ziekte|beperking|handelingsplan|opp)\\b",
  "i"
);

const EMAIL =
  /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;

/** Gespelde e-mail-obfuscatie: "jan at school punt nl", "jan [at] school [dot] nl". */
const EMAIL_GESPELD = new RegExp(
  "[A-Z0-9._%+-]+\\s*[[(]?\\s*(?:at|apenstaartje)\\s*[)\\]]?\\s*" +
    "[A-Z0-9.-]+\\s*[[(]?\\s*(?:dot|punt)\\s*[)\\]]?\\s*[A-Z]{2,}",
  "i"
);

const TELEFOON = /(?:\+31|0)\s*\d(?:[\s.-]*\d){8,}/;

/** Negen aaneengesloten cijfers: een BSN-achtig nummer. Losstaand, geen deel van een langer getal. */
const BSN_ACHTIG = /(?<!\d)\d{9}(?!\d)/;

/** Voornaam + achternaam met hoofdletters: iets anders dan initialen zoals "L.J.". */
const VOLLEDIGE_NAAM = /\b[A-ZÀ-ÖØ-Ý][a-zà-öø-ÿ]{2,}\s+[A-ZÀ-ÖØ-Ý][a-zà-öø-ÿ]{2,}\b/;

/**
 * Aanhef gevolgd door een naam: "Beste Sem,", "Dag Anna", "Hoi Bram!",
 * "Geachte heer/mevrouw Jansen", "Ouders van Sem", "vader/moeder van Lotte".
 * Vangt ook het geval dat een regex geen éénnaams-voornaam kan onderscheiden
 * van een gewoon woord: een aanhef ervoor is een sterke aanwijzing dat het
 * woord erna wél een naam is.
 */
const AANHEF_MET_NAAM = new RegExp(
  "\\b(?:beste|dag|hoi|hallo|geachte heer|geachte mevrouw|geachte heer\\/mevrouw|" +
    "ouders van|vader van|moeder van)\\s+[A-ZÀ-ÖØ-Ý][a-zà-öø-ÿ]{1,}\\b",
  "i"
);

const REDEN_LABELS: Record<string, string> = {
  medisch: "medische of diagnose-termen",
  contact: "een e-mailadres of telefoonnummer",
  bsn: "een BSN-achtig nummer",
  naam: "een voornaam uit de vaste namenlijst, een volledige naam of een aanhef met een naam erin",
};

function heeftBekendeVoornaam(tekst: string): boolean {
  for (const token of tekst.toLowerCase().split(/[^\p{L}]+/u)) {
    if (token && NEDERLANDSE_VOORNAMEN.has(token)) return true;
  }
  return false;
}

/**
 * Controleert tekst die naar het model zou gaan. `ok: false` betekent: niets
 * verzenden, de aanroeper krijgt een B1-uitleg en de docent past de tekst aan.
 * `genormaliseerd` is de tekst die bij `ok: true` daadwerkelijk verzonden
 * hoort te worden, nooit de ruwe `tekst`-parameter.
 */
export function privacyGate(tekst: string): PrivacyGateResultaat {
  const genormaliseerd = normaliseerTekst(tekst);
  const gecomprimeerd = comprimeerVoorDetectie(genormaliseerd);

  const gevonden = new Set<string>();
  if (MEDISCHE_TERMEN.test(genormaliseerd) || MEDISCHE_TERMEN.test(gecomprimeerd)) {
    gevonden.add(REDEN_LABELS.medisch);
  }
  if (
    EMAIL.test(genormaliseerd) ||
    EMAIL_GESPELD.test(genormaliseerd) ||
    EMAIL.test(gecomprimeerd) ||
    TELEFOON.test(genormaliseerd) ||
    TELEFOON.test(gecomprimeerd)
  ) {
    gevonden.add(REDEN_LABELS.contact);
  }
  if (BSN_ACHTIG.test(genormaliseerd) || BSN_ACHTIG.test(gecomprimeerd)) {
    gevonden.add(REDEN_LABELS.bsn);
  }
  if (
    VOLLEDIGE_NAAM.test(genormaliseerd) ||
    AANHEF_MET_NAAM.test(genormaliseerd) ||
    heeftBekendeVoornaam(genormaliseerd) ||
    heeftBekendeVoornaam(gecomprimeerd)
  ) {
    gevonden.add(REDEN_LABELS.naam);
  }
  return { ok: gevonden.size === 0, redenen: Array.from(gevonden), genormaliseerd };
}

/** B1-uitleg bij een blokkade, voor zowel de API-respons als de UI. */
export function privacyGateUitleg(redenen: string[]): string {
  return (
    "Deze tekst gaat niet naar de AI, want er staat mogelijk " +
    redenen.join(" en ") +
    " in. Haal dit eruit en probeer het opnieuw. De filter vangt herkenbare " +
    "contactgegevens, medische termen en veelvoorkomende voornamen uit een vaste " +
    "lijst. Zeldzame namen kunnen erdoorheen. Zet zelf geen namen in de tekst."
  );
}
