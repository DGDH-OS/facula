"use client";
import { useId, useState } from "react";
import { Button } from "@/components/ui/Button";
import { AiMelding } from "@/components/ui/AiMelding";
import type { AssistTaak } from "@/lib/ai/assist-tasks";

interface AssistResponse {
  onderwerp: string | null;
  voorstel: string;
}

/**
 * Gedeeld paneel voor "Verbeter met AI" / "Vraag AI om een voorstel", gebruikt
 * in de ouder-, nakijk-, toetsweek- en rapportmodule. Roept POST
 * /api/ai/assist aan met een vaste taak, toont het voorstel bewerkbaar naast
 * het origineel, en laat de docent kiezen: "Gebruik dit voorstel" of "Terug
 * naar origineel". Nooit automatisch overnemen.
 *
 * `disabledReden` komt van de bestaande privacyblokkade in de UI (bijv.
 * privacyOuders(...).blokkeer): zolang die blokkeert, blijft deze knop ook
 * uitgeschakeld, met uitleg via aria-disabled.
 */
export function AiAssistPaneel({
  taak,
  label = "Vraag AI om een voorstel",
  onderwerp,
  tekst,
  toon,
  disabledReden,
  onGebruik,
}: {
  taak: AssistTaak;
  label?: string;
  onderwerp?: string;
  tekst: string;
  toon?: string;
  disabledReden?: string | null;
  onGebruik: (voorstel: string, onderwerp: string | null) => void;
}) {
  const [status, setStatus] = useState<"leeg" | "bezig" | "klaar" | "fout">("leeg");
  const [melding, setMelding] = useState("");
  const [voorstel, setVoorstel] = useState<AssistResponse | null>(null);
  const [bewerkteTekst, setBewerkteTekst] = useState("");
  const meldingId = useId();
  const redenId = useId();

  const geblokkeerd = Boolean(disabledReden) || !tekst.trim();
  const geblokkeerdReden = disabledReden ?? "Vul eerst tekst in.";

  async function vraagVoorstel() {
    setStatus("bezig");
    setMelding("");
    setVoorstel(null);
    try {
      const response = await fetch("/api/ai/assist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taak, onderwerp, tekst, toon }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(data?.error ?? "AI-assist lukte nu niet.");
      }
      setVoorstel(data as AssistResponse);
      setBewerkteTekst((data as AssistResponse).voorstel);
      setStatus("klaar");
    } catch (err) {
      setMelding(err instanceof Error ? err.message : "AI-assist lukte nu niet.");
      setStatus("fout");
    }
  }

  function terugNaarOrigineel() {
    setVoorstel(null);
    setStatus("leeg");
    setMelding("");
  }

  return (
    <div className="mt-4 space-y-3">
      {status !== "klaar" && (
        <Button
          type="button"
          className="aria-disabled:cursor-not-allowed aria-disabled:opacity-70"
          aria-disabled={geblokkeerd || status === "bezig"}
          aria-describedby={geblokkeerd ? redenId : undefined}
          onClick={() => {
            if (geblokkeerd || status === "bezig") return;
            void vraagVoorstel();
          }}
        >
          {status === "bezig" ? "AI denkt na..." : label}
        </Button>
      )}
      {geblokkeerd && status !== "klaar" && (
        <p id={redenId} className="text-base text-tekst-zacht">
          {geblokkeerdReden}
        </p>
      )}
      <p id={meldingId} aria-live="polite" className="text-base text-tekst-zacht">
        {status === "bezig" ? "AI denkt na, dit duurt meestal een paar seconden." : ""}
        {status === "fout" ? melding : ""}
      </p>
      {status === "klaar" && voorstel && (
        <div className="space-y-3 rounded-xl border-2 border-lijn bg-neutraal-vlak p-4">
          <AiMelding variant="regel" />
          {voorstel.onderwerp && (
            <p className="text-base">
              <strong>Voorgesteld onderwerp:</strong> {voorstel.onderwerp}
            </p>
          )}
          <label className="block text-base font-semibold text-marine">
            Voorstel van AI, bewerkbaar
            <textarea
              className={[
                "mt-2 min-h-11 w-full rounded-lg border-2 border-lijn bg-ivoor p-3",
                "text-base leading-relaxed focus:outline-none focus:ring-2 focus:ring-marine",
              ].join(" ")}
              rows={6}
              value={bewerkteTekst}
              onChange={(event) => setBewerkteTekst(event.target.value)}
            />
          </label>
          <div className="flex flex-wrap gap-3">
            <Button
              variant="primary"
              type="button"
              onClick={() => {
                onGebruik(bewerkteTekst, voorstel.onderwerp);
                terugNaarOrigineel();
              }}
            >
              Gebruik dit voorstel
            </Button>
            <Button type="button" onClick={terugNaarOrigineel}>
              Terug naar origineel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
