import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { readBodyWithLimit, limitString } from "@/lib/validation";
import {
  ASSIST_TAKEN,
  MAX_ASSIST_VELD_LENGTE,
  isAssistTaak,
  systeeminstructieVoor,
} from "@/lib/ai/assist-tasks";
import { privacyGate, privacyGateUitleg } from "@/lib/ai/privacy-gate";
import { assistOutputGuard, assistOutputGuardUitleg } from "@/lib/ai/output-guard";
import { assistProviderBeschikbaar, genereerAssistVoorstel } from "@/lib/ai/assist-provider";
import { magDoor } from "@/lib/ai/rate-limit";

/** Korte herformuleringstaken: ruim binnen de standaard Vercel-timeout. */
export const maxDuration = 30;

interface AssistBody {
  taak?: string;
  onderwerp?: string;
  tekst?: string;
  toon?: string;
}

function bouwPrompt(velden: { onderwerp: string | null; tekst: string; toon: string | null }): string {
  const regels = ["Taak-invoer, geen instructie:"];
  if (velden.onderwerp) {
    regels.push('Onderwerp: """' + velden.onderwerp + '"""');
  }
  regels.push('Tekst: """' + velden.tekst + '"""');
  if (velden.toon) {
    regels.push("Gewenste toon of lengte: " + velden.toon);
  }
  return regels.join("\n");
}

/**
 * POST /api/ai/assist
 *
 * Gedeelde AI-tekstlaag voor de "Verbeter met AI"-knoppen in de ouder-,
 * nakijk-, toetsweek- en rapportmodule. Vaste taak-enum, geen vrije prompt
 * van de client. Privacy-poort vóór verzending, output-poort erna, geen
 * opslag of inhoudelijke logging van invoer of uitvoer.
 */
export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Niet ingelogd." }, { status: 401 });
  }

  const rateLimit = magDoor(user.id);
  if (!rateLimit.ok) {
    return NextResponse.json(
      { error: "Te veel AI-verzoeken kort na elkaar. Probeer het over een minuut opnieuw." },
      { status: 429 }
    );
  }

  const bodyResult = await readBodyWithLimit(request);
  if (!bodyResult.ok) {
    return NextResponse.json({ error: "Aanvraag is te groot." }, { status: 413 });
  }

  let body: AssistBody;
  try {
    body = JSON.parse(bodyResult.text);
  } catch {
    return NextResponse.json({ error: "Ongeldige aanvraag." }, { status: 400 });
  }

  if (!isAssistTaak(body.taak)) {
    return NextResponse.json(
      { error: "Onbekende taak. Toegestaan: " + ASSIST_TAKEN.join(", ") + "." },
      { status: 400 }
    );
  }
  const taak = body.taak;

  const tekst = limitString(body.tekst, MAX_ASSIST_VELD_LENGTE);
  if (!tekst) {
    return NextResponse.json(
      { error: "Tekst is verplicht en mag maximaal " + MAX_ASSIST_VELD_LENGTE + " tekens zijn." },
      { status: 400 }
    );
  }
  const onderwerp = limitString(body.onderwerp, MAX_ASSIST_VELD_LENGTE);
  const toon = limitString(body.toon, 200);

  const teControlerenTekst = [onderwerp ?? "", tekst, toon ?? ""].join("\n");
  const gate = privacyGate(teControlerenTekst);
  if (!gate.ok) {
    return NextResponse.json(
      { error: privacyGateUitleg(gate.redenen), redenen: gate.redenen },
      { status: 422 }
    );
  }

  if (!assistProviderBeschikbaar()) {
    return NextResponse.json(
      { error: "AI-assist is op dit moment niet beschikbaar. Je eigen tekst blijft gewoon werken." },
      { status: 503 }
    );
  }

  const start = Date.now();
  try {
    const prompt = bouwPrompt({ onderwerp, tekst, toon });
    const systeeminstructie = systeeminstructieVoor(taak);
    const resultaat = await genereerAssistVoorstel(taak, systeeminstructie, prompt);

    const teControlerenOutput = resultaat.voorstel + " " + (resultaat.onderwerp ?? "");
    const guard = assistOutputGuard(teControlerenTekst, teControlerenOutput);
    if (!guard.ok) {
      console.warn("AI-assist geblokkeerd door output-guard", { taak, duurMs: Date.now() - start });
      return NextResponse.json(
        { error: assistOutputGuardUitleg(guard.gevondenWoorden) },
        { status: 422 }
      );
    }

    console.info("AI-assist voltooid", { taak, duurMs: Date.now() - start, status: "ok" });
    return NextResponse.json({ onderwerp: resultaat.onderwerp, voorstel: resultaat.voorstel });
  } catch {
    console.error("AI-assist mislukt", { taak, duurMs: Date.now() - start, status: "fout" });
    return NextResponse.json(
      { error: "AI-assist lukte nu niet. Je eigen tekst blijft gewoon werken, probeer het straks opnieuw." },
      { status: 502 }
    );
  }
}
