import { useState } from "react";
import { isoWeekLabel, isoWeekSleutel, type KlasWeekAnalyse } from "@/lib/toetsweek/planner";
import type { ToetsweekSignaal } from "@/lib/toetsweek/planner";
import { AiAssistPaneel } from "@/components/ai/AiAssistPaneel";
import { vervangVoornamen } from "@/lib/ai/assist-payload";
import { AiMelding } from "@/components/ui/AiMelding";

const STATUS_LABEL: Record<KlasWeekAnalyse["status"], string> = {
  rustig: "Rustig",
  druk: "Druk",
  "te druk": "Te druk",
};

const STATUS_KLASSEN: Record<KlasWeekAnalyse["status"], string> = {
  rustig: "text-tekst",
  druk: "border-waarschuwing-tekst bg-waarschuwing-vlak text-waarschuwing-tekst",
  "te druk": "border-fout-tekst bg-fout-vlak text-fout-tekst",
};

function bouwMatrix(analyses: KlasWeekAnalyse[]) {
  const klassen = [...new Set(analyses.map((analyse) => analyse.klas))].sort();
  const wekenMap = new Map<string, { jaar: number; week: number }>();
  for (const analyse of analyses) {
    wekenMap.set(isoWeekSleutel(analyse), { jaar: analyse.jaar, week: analyse.week });
  }
  const weken = [...wekenMap.values()].sort((a, b) => a.jaar - b.jaar || a.week - b.week);
  const cellen = new Map<string, KlasWeekAnalyse>();
  for (const analyse of analyses) {
    cellen.set(`${analyse.klas}|${isoWeekSleutel(analyse)}`, analyse);
  }
  return { klassen, weken, cellen };
}

/**
 * Alleen klas, ISO-week, status en aantal items per analyse: geen toetsnaam,
 * geen notitie, geen leerlingaantal per leerling. Dit is de geaggregeerde,
 * niet-persoonlijke samenvatting die naar AI-assist mag.
 */
function bouwSamenvatting(analyses: KlasWeekAnalyse[]): string {
  if (!analyses.length) return "";
  return analyses
    .filter((analyse) => analyse.status !== "rustig")
    .map(
      (analyse) =>
        `${analyse.klas}, ${isoWeekLabel(analyse)}: status ${analyse.status}, ` +
        `${analyse.items.length} toetsen/deadlines.`,
    )
    .join("\n");
}

export function OverzichtTab({
  analyses,
  signalen,
  privacyGeblokkeerd,
}: {
  analyses: KlasWeekAnalyse[];
  signalen: ToetsweekSignaal[];
  privacyGeblokkeerd: boolean;
}) {
  const { klassen, weken, cellen } = bouwMatrix(analyses);
  const samenvatting = bouwSamenvatting(analyses);
  const [aiTips, setAiTips] = useState<string | null>(null);

  return (
    <section className="space-y-6">
      {klassen.length === 0 ? (
        <p className="text-base text-tekst-zacht">
          Nog geen geldige toetsen of deadlines ingevoerd. Vul eerst toetsen in.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border-2 border-lijn bg-ivoor">
          <table className="w-full min-w-[42rem] text-left text-base">
            <caption className="p-5 text-left font-display text-2xl text-marine">
              Overzicht per klas per week
            </caption>
            <thead>
              <tr className="border-t-2 border-lijn">
                <th scope="col" className="p-3 font-semibold">
                  Klas
                </th>
                {weken.map((week) => (
                  <th key={isoWeekSleutel(week)} scope="col" className="p-3 font-semibold">
                    {isoWeekLabel(week)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {klassen.map((klas) => (
                <tr key={klas} className="border-t border-lijn">
                  <th scope="row" className="p-3 font-semibold">
                    {klas}
                  </th>
                  {weken.map((week) => {
                    const analyse = cellen.get(`${klas}|${isoWeekSleutel(week)}`);
                    return (
                      <td key={isoWeekSleutel(week)} className="p-3">
                        {analyse ? (
                          <span
                            className={`rounded-lg border-2 px-2 py-1 ${STATUS_KLASSEN[analyse.status]}`}
                          >
                            {STATUS_LABEL[analyse.status]} ({analyse.items.length})
                          </span>
                        ) : (
                          <span className="text-tekst-zacht">geen toetsen</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="rounded-xl border-2 border-lijn bg-neutraal-vlak p-5">
        <h2 className="font-display text-2xl text-marine">Signalen</h2>
        {signalen.length === 0 ? (
          <p className="mt-3 text-base text-tekst-zacht">
            Geen signalen: de werkdruk is verdeeld over de weken.
          </p>
        ) : (
          <ul className="mt-3 list-disc space-y-2 pl-5">
            {signalen.map((signaal, index) => (
              <li key={`${signaal.datum}-${index}`} className="text-base">
                {signaal.tekst}
              </li>
            ))}
          </ul>
        )}
        {samenvatting && (
          <div className="print:hidden">
            {aiTips ? (
              <div className="mt-4 space-y-2 rounded-lg border-2 border-lijn bg-ivoor p-4">
                <AiMelding variant="regel" />
                <p className="whitespace-pre-wrap text-base text-tekst">{aiTips}</p>
              </div>
            ) : (
              <AiAssistPaneel
                taak="toetsweek_tips"
                label="Vraag AI om spreidingstips"
                tekst={vervangVoornamen(samenvatting)}
                disabledReden={privacyGeblokkeerd ? "Los eerst de privacyblokkade op." : null}
                onGebruik={(voorstel) => setAiTips(voorstel)}
              />
            )}
          </div>
        )}
      </div>
    </section>
  );
}
