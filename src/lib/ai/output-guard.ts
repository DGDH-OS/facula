import { controleerOutputTegenInvoer } from "../avg-guardrails";

/**
 * Output-poort voor de gedeelde AI-assistlaag: het model mag nooit zelf een
 * cijfer, beoordeling, niveau-advies, diagnose of oordeel over een leerling
 * toevoegen dat niet al letterlijk in de invoer van de docent stond.
 *
 * Hergebruikt de bestaande, geteste rapport-module-guardrail: dezelfde regel
 * geldt hier, alleen nu voor elke AI-assist-taak in plaats van alleen de
 * rapport-module.
 */
export interface AssistOutputGuardResultaat {
  ok: boolean;
  gevondenWoorden: string[];
}

export function assistOutputGuard(
  origineleInvoer: string,
  voorstel: string
): AssistOutputGuardResultaat {
  const resultaat = controleerOutputTegenInvoer(origineleInvoer, voorstel);
  return { ok: resultaat.ok, gevondenWoorden: resultaat.gevondenWoorden };
}

export function assistOutputGuardUitleg(gevondenWoorden: string[]): string {
  return (
    "Dit voorstel bevat mogelijk een cijfer of oordeel dat niet in jouw eigen " +
    "tekst stond (" +
    gevondenWoorden.join(", ") +
    "). Het voorstel wordt niet getoond. Gebruik het origineel of pas je invoer aan."
  );
}
