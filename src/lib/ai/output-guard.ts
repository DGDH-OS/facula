import { controleerOutputTegenInvoer } from "../avg-guardrails";
import { normaliseerTekst } from "./privacy-gate";

/**
 * Output-poort voor de gedeelde AI-assistlaag: het model mag nooit zelf een
 * cijfer, beoordeling, niveau-advies, diagnose of oordeel over een leerling
 * toevoegen dat niet al letterlijk in de invoer van de docent stond.
 *
 * Hergebruikt de bestaande, geteste rapport-module-guardrail
 * (controleerOutputTegenInvoer) als basis, en breidt die HIER uit met
 * schoolniveaus, oordeelwoorden, cijfers-als-woord, breuken/procenten/punten
 * en diagnose-termen. Bewust niet in avg-guardrails.ts zelf: de
 * rapportgenerator gebruikt daar dezelfde functie voor eigen sjabloontekst
 * die woorden als "goed" bevat zonder dat die letterlijk in de aantekening
 * van de docent staat (bijv. "Wat goed gaat bij X:"): die uitbreiding zou
 * de bestaande rapportmodule stukmaken. Voor de AI-assistlaag is diezelfde
 * "alleen blokkeren als het niet al in de invoer stond"-regel wel veilig,
 * want hier is de invoer altijd de eigen tekst van de docent, geen vast
 * sjabloon.
 */
export interface AssistOutputGuardResultaat {
  ok: boolean;
  gevondenWoorden: string[];
}

/** Diagnose-/medische termen: zelfde lijst als de privacy-poort, hier als extra check op de OUTPUT. */
const DIAGNOSE_TERMEN = [
  "adhd", "add", "dyslectisch", "dyslectische", "dyslexie", "dyscalculie",
  "autisme", "autist", "autistisch", "autistische", "diagnose", "gediagnosticeerd",
  "medicatie", "depressie", "depressief", "angststoornis", "trauma", "ptss",
  "hoogsensitief", "hoogsensitieve", "hoogbegaafd", "hoogbegaafdheid",
  "psycholoog", "psychiater", "therapie", "rugzak", "pgb", "zorgplan",
  "ziekte", "beperking", "handelingsplan", "opp",
];

const SCHOOLNIVEAUS = [
  "vmbo", "havo", "vwo", "gymnasium", "mavo", "kader", "basis", "tl", "gl",
  "bb", "kb", "niveau", "doorstroom", "advies", "blijven zitten", "overgaan",
  "doubleren",
];

const OORDEELWOORDEN = [
  "voldoende", "onvoldoende", "goed", "slecht", "zwak", "sterk",
  "uitstekend", "matig", "ruim voldoende", "geslaagd", "gezakt",
  "excellent", "insufficient", "pass", "fail",
];

/** Losse getal-woorden "een" t/m "tien"; als los woord, niet als deel van een ander woord. */
const GETAL_WOORDEN = [
  "een", "twee", "drie", "vier", "vijf", "zes", "zeven", "acht", "negen", "tien",
];
const GETAL_WOORD_REGEX = new RegExp(
  "\\b(?:" + GETAL_WOORDEN.join("|") + ")\\b(?:\\s+komma\\s+\\b(?:" + GETAL_WOORDEN.join("|") + ")\\b)?",
  "gi"
);

/** "7/10", "18 punten", "80%". */
const BREUK_OF_PUNTEN_REGEX = /\b\d+\s*\/\s*\d+\b|\b\d+\s*%|\b\d+([.,]\d+)?\s+punten\b/gi;

/** Arabische-Indische en Extended Arabische-Indische cijfers naar ASCII, vóór elke cijfercontrole. */
const UNICODE_CIJFERS: Record<string, string> = {
  "٠": "0", "١": "1", "٢": "2", "٣": "3", "٤": "4",
  "٥": "5", "٦": "6", "٧": "7", "٨": "8", "٩": "9",
  "۰": "0", "۱": "1", "۲": "2", "۳": "3", "۴": "4",
  "۵": "5", "۶": "6", "۷": "7", "۸": "8", "۹": "9",
};
const UNICODE_CIJFER_REGEX = new RegExp(Object.keys(UNICODE_CIJFERS).join("|"), "g");

function normaliseerVoorOutputCheck(tekst: string): string {
  return normaliseerTekst(tekst)
    .replace(UNICODE_CIJFER_REGEX, (cijfer) => UNICODE_CIJFERS[cijfer] ?? cijfer)
    .toLowerCase();
}

/**
 * Woorden/patronen die in de OUTPUT staan maar niet letterlijk in de INVOER,
 * uit een vaste lijst plus een paar patronen (breuk/procent/punten,
 * cijfer-als-woord). Zelfde "alleen blokkeren als nieuw toegevoegd"-regel als
 * de rest van dit bestand.
 */
function nieuweTermenInOutput(invoerLower: string, outputLower: string): string[] {
  const gevonden: string[] = [];

  for (const term of [...DIAGNOSE_TERMEN, ...SCHOOLNIVEAUS, ...OORDEELWOORDEN]) {
    const patroon = new RegExp("\\b" + term.replace(/\s+/g, "\\s+") + "\\b", "i");
    if (patroon.test(outputLower) && !patroon.test(invoerLower)) {
      gevonden.push(term);
    }
  }

  for (const match of outputLower.match(GETAL_WOORD_REGEX) ?? []) {
    if (!new RegExp("\\b" + match.trim().replace(/\s+/g, "\\s+") + "\\b", "i").test(invoerLower)) {
      gevonden.push(match.trim());
    }
  }

  for (const match of outputLower.match(BREUK_OF_PUNTEN_REGEX) ?? []) {
    if (!invoerLower.includes(match)) {
      gevonden.push(match.trim());
    }
  }

  return Array.from(new Set(gevonden));
}

export function assistOutputGuard(
  origineleInvoer: string,
  voorstel: string
): AssistOutputGuardResultaat {
  const basis = controleerOutputTegenInvoer(origineleInvoer, voorstel);

  const invoerLower = normaliseerVoorOutputCheck(origineleInvoer);
  const outputLower = normaliseerVoorOutputCheck(voorstel);
  const extra = nieuweTermenInOutput(invoerLower, outputLower);

  const gevondenWoorden = Array.from(new Set([...basis.gevondenWoorden, ...extra]));
  return { ok: gevondenWoorden.length === 0, gevondenWoorden };
}

export function assistOutputGuardUitleg(gevondenWoorden: string[]): string {
  return (
    "Dit voorstel bevat mogelijk een cijfer, niveau of oordeel dat niet in jouw eigen " +
    "tekst stond (" +
    gevondenWoorden.join(", ") +
    "). Het voorstel wordt niet getoond. Gebruik het origineel of pas je invoer aan."
  );
}
