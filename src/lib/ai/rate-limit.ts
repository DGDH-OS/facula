/**
 * Eenvoudige in-memory rate-limit per gebruiker per emmer.
 *
 * Assist: 10/min. Lessen: 5/min, vóór de modelaanroep.
 *
 * Beperking, bewust gedocumenteerd: dit geheugen is per functie-instantie.
 * Op Vercel (Fluid Compute) kunnen meerdere instanties tegelijk draaien, en
 * een nieuwe cold start wist de teller. Dit is dus geen harde garantie tegen
 * misbruik, alleen een goedkope rem tegen een docent (of een kapotte tab) die
 * per ongeluk tientallen keren per minuut aanroept. Een harde limiet loopt via
 * hetzelfde quotum-mechanisme als lessen/toetsen/rapporten (facula.profiles),
 * niet via dit bestand.
 */

const VENSTER_MS = 60_000;
export const ASSIST_MAX_PER_MINUUT = 10;
export const LESSEN_MAX_PER_MINUUT = 5;

const tellers = new Map<string, { aantal: number; vensterStart: number }>();

export interface RateLimitResultaat {
  ok: boolean;
  overMs: number;
}

export function magDoor(
  userId: string,
  opties?: { maxPerVenster?: number; sleutel?: string },
): RateLimitResultaat {
  const max = opties?.maxPerVenster ?? ASSIST_MAX_PER_MINUUT;
  const id = `${opties?.sleutel ?? "assist"}:${userId}`;
  const nu = Date.now();
  const bestaand = tellers.get(id);
  if (!bestaand || nu - bestaand.vensterStart >= VENSTER_MS) {
    tellers.set(id, { aantal: 1, vensterStart: nu });
    return { ok: true, overMs: 0 };
  }
  if (bestaand.aantal >= max) {
    return { ok: false, overMs: VENSTER_MS - (nu - bestaand.vensterStart) };
  }
  bestaand.aantal++;
  return { ok: true, overMs: 0 };
}
