/**
 * De vaste taak-enum voor POST /api/ai/assist. Een client stuurt nooit een
 * vrije prompt mee, alleen een taaknaam uit deze lijst plus de invoervelden
 * die bij die taak horen; de systeeminstructie staat hier, op de server.
 */
export type AssistTaak =
  | "ouder_mail_verbeter"
  | "nakijk_feedback_verbeter"
  | "toetsweek_tips"
  | "rapport_herformuleer";

export const ASSIST_TAKEN: AssistTaak[] = [
  "ouder_mail_verbeter",
  "nakijk_feedback_verbeter",
  "toetsweek_tips",
  "rapport_herformuleer",
];

export function isAssistTaak(waarde: unknown): waarde is AssistTaak {
  return typeof waarde === "string" && (ASSIST_TAKEN as string[]).includes(waarde);
}

/** Gedeelde regels voor elke taak: staan vóór de taakspecifieke instructie. */
const GEMEENSCHAPPELIJKE_REGELS = [
  "Taal: Nederlands, B1-niveau, korte zinnen.",
  "Verboden tekens: het kastlijntje — en het gedachtestreepje –. Gebruik een komma, een",
  "dubbele punt of een nieuwe zin.",
  "Geen markdown: geen sterretjes, geen koppen, geen opsommingstekens in de tekst zelf.",
  "Voeg NOOIT een cijfer, beoordeling, niveau-advies, diagnose of oordeel toe dat niet al",
  "letterlijk in de invoer van de docent stond. Je herformuleert, je beoordeelt niet.",
  "Verzin geen nieuwe feiten, namen, data of gebeurtenissen die niet in de invoer stonden.",
  "Jij doet een voorstel. De docent beslist zelf en past het voorstel aan waar nodig.",
  "Output: alleen JSON volgens het schema, zonder toelichting eromheen.",
].join("\n");

const TAAK_INSTRUCTIES: Record<AssistTaak, string> = {
  ouder_mail_verbeter:
    "Rol: schrijfhulp voor een oudermail van een docent aan ouders/verzorgers.\n" +
    "Herschrijf het meegegeven onderwerp en de tekst in de gevraagde toon en lengte.\n" +
    "Blijf bij wat de docent al schreef: geen nieuwe observatie of actie toevoegen.",
  nakijk_feedback_verbeter:
    "Rol: schrijfhulp voor feedback aan een leerling, volgens feed up / feed back / feed forward.\n" +
    "Maak de meegegeven feedback duidelijker en vriendelijker geformuleerd, met dezelfde",
  toetsweek_tips:
    "Rol: adviseur werkdrukspreiding voor een docententeam.\n" +
    "Je krijgt een geanonimiseerde samenvatting van drukke toetsweken per klas (geen",
  rapport_herformuleer:
    "Rol: schrijfhulp voor een rapporttekst, oudergesprek-verslag of oudermail-concept.\n" +
    "Herformuleer de meegegeven tekst zodat hij vlotter leest, zonder de inhoud te",
};

/** Volledige structuur, uitgeschreven per taak (de bovenstaande labels zijn bewust kort). */
const TAAK_UITLEG: Record<AssistTaak, string> = {
  ouder_mail_verbeter:
    TAAK_INSTRUCTIES.ouder_mail_verbeter,
  nakijk_feedback_verbeter:
    TAAK_INSTRUCTIES.nakijk_feedback_verbeter +
    " inhoud en dezelfde indeling (feed up, feed back, feed forward) als het origineel.",
  toetsweek_tips:
    TAAK_INSTRUCTIES.toetsweek_tips +
    " leerlingnamen, alleen klas/vak/week/aantal). Geef twee tot drie korte, praktische tips" +
    " om de piekweken te spreiden. Geen tip die een concrete leerling noemt, want die staat" +
    " niet in de invoer.",
  rapport_herformuleer:
    TAAK_INSTRUCTIES.rapport_herformuleer +
    " veranderen. Geen nieuwe waarneming, cijfer of conclusie toevoegen.",
};

export function systeeminstructieVoor(taak: AssistTaak): string {
  return TAAK_UITLEG[taak] + "\n\n" + GEMEENSCHAPPELIJKE_REGELS;
}

/** Maximale lengte per invoerveld, vóór de privacy-poort en het model. */
export const MAX_ASSIST_VELD_LENGTE = 4000;
