/**
 * Eenvoudige in-memory rate-limit per gebruiker voor POST /api/ai/assist.
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
const MAX_PER_VENSTER = 10;

const tellers = new Map<string, { aantal: number; vensterStart: number }>();

export interface RateLimitResultaat {
  ok: boolean;
  overMs: number;
}

export function magDoor(userId: string): RateLimitResultaat {
  const nu = Date.now();
  const bestaand = tellers.get(userId);
  if (!bestaand || nu - bestaand.vensterStart >= VENSTER_MS) {
    tellers.set(userId, { aantal: 1, vensterStart: nu });
    return { ok: true, overMs: 0 };
  }
  if (bestaand.aantal >= MAX_PER_VENSTER) {
    return { ok: false, overMs: VENSTER_MS - (nu - bestaand.vensterStart) };
  }
  bestaand.aantal++;
  return { ok: true, overMs: 0 };
}
