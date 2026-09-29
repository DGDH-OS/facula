/**
 * Server-side privacy-poort vóór ELKE tekst die naar het AI-model gaat, voor
 * de gedeelde AI-assistlaag (src/lib/ai/assist.ts). Blokkeert vóór verzending,
 * niet erna: niets van de gevonden invoer wordt naar Vertex AI gestuurd.
 *
 * Bewust regel-gebaseerd en niet een AI-classifier, zelfde reden als
 * avg-guardrails.ts: een blokkade moet uitlegbaar en getest zijn, niet zelf
 * weer een modelbeslissing.
 */

export interface PrivacyGateResultaat {
  ok: boolean;
  redenen: string[];
}

const MEDISCHE_TERMEN = new RegExp(
  "\\b(adhd|add|dyslexie|dyscalculie|autisme|autistisch|diagnose|gediagnosticeerd|" +
    "medicatie|depressie|angststoornis|trauma|ptss|hoogsensitief|hoogbegaafd(?:heid)?)\\b",
  "i"
);

const EMAIL_OF_TELEFOON =
  /(?:[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}|(?:\+31|0)\s*\d(?:[\s-]*\d){8,})/i;

/** Negen aaneengesloten cijfers: een BSN-achtig nummer. Losstaand, geen deel van een langer getal. */
const BSN_ACHTIG = /(?<!\d)\d{9}(?!\d)/;

/** Voornaam + achternaam met hoofdletters: iets anders dan initialen zoals "L.J.". */
const VOLLEDIGE_NAAM = /\b[A-ZÀ-ÖØ-Ý][a-zà-öø-ÿ]{2,}\s+[A-ZÀ-ÖØ-Ý][a-zà-öø-ÿ]{2,}\b/;

const REDEN_LABELS: Record<string, string> = {
  medisch: "medische of diagnose-termen",
  contact: "een e-mailadres of telefoonnummer",
  bsn: "een BSN-achtig nummer",
  naam: "een volledige naam (voornaam en achternaam)",
};

/**
 * Controleert tekst die naar het model zou gaan. `ok: false` betekent: niets
 * verzenden, de aanroeper krijgt een B1-uitleg en de docent past de tekst aan.
 */
export function privacyGate(tekst: string): PrivacyGateResultaat {
  const gevonden: string[] = [];
  if (MEDISCHE_TERMEN.test(tekst)) gevonden.push(REDEN_LABELS.medisch);
  if (EMAIL_OF_TELEFOON.test(tekst)) gevonden.push(REDEN_LABELS.contact);
  if (BSN_ACHTIG.test(tekst)) gevonden.push(REDEN_LABELS.bsn);
  if (VOLLEDIGE_NAAM.test(tekst)) gevonden.push(REDEN_LABELS.naam);
  return { ok: gevonden.length === 0, redenen: gevonden };
}

/** B1-uitleg bij een blokkade, voor zowel de API-respons als de UI. */
export function privacyGateUitleg(redenen: string[]): string {
  return (
    "Deze tekst gaat niet naar de AI, want er staat mogelijk " +
    redenen.join(" en ") +
    " in. Haal dit eruit en probeer het opnieuw."
  );
}
