import { NEDERLANDSE_VOORNAMEN } from "./nederlandse-voornamen";
import { normaliseerTekst } from "./privacy-gate";

const PLACEHOLDER = "de leerling";

/**
 * Vervangt bekende voornamen door "de leerling" vóór de assist-aanvraag.
 * Geen leerlingenlijst: alleen de vaste voornamenlijst, exact token.
 */
export function vervangVoornamen(tekst: string): string {
  return tekst.replace(/[\p{L}]+/gu, (token) => {
    const sleutel = normaliseerTekst(token).toLowerCase();
    return NEDERLANDSE_VOORNAMEN.has(sleutel) ? PLACEHOLDER : token;
  });
}

export function bouwAssistBody(invoer: {
  taak: string;
  onderwerp?: string;
  tekst: string;
  toon?: string;
}): { taak: string; onderwerp?: string; tekst: string; toon?: string } {
  return {
    taak: invoer.taak,
    onderwerp: invoer.onderwerp ? vervangVoornamen(invoer.onderwerp) : undefined,
    tekst: vervangVoornamen(invoer.tekst),
    toon: invoer.toon,
  };
}
