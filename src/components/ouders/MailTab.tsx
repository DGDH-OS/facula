"use client";
import { useState } from "react";
import { valideerInitialen } from "@/lib/nakijken/rubric";
import { maakOudermail, type MailInput } from "@/lib/ouders/mail";
import { privacyOuders } from "@/lib/ouders/privacy";
import { AANLEIDINGEN } from "@/lib/ouders/templates";
import { AiAssistPaneel } from "@/components/ai/AiAssistPaneel";
import { vervangVoornamen } from "@/lib/ai/assist-payload";
import { Veld, inputClass } from "./Veld";
import { OuderOutput } from "./OuderOutput";
export function MailTab({
  mail,
  setMail,
}: {
  mail: MailInput;
  setMail: (mail: MailInput) => void;
}) {
  const gegenereerd = maakOudermail(mail);
  const [aiVoorstel, setAiVoorstel] = useState<{ subject: string; body: string } | null>(null);
  const output = aiVoorstel ?? gegenereerd;

  // De leerlingnaam is hier bekend (mail.leerling): die gaat nooit mee naar
  // de AI, ook al is het veld bedoeld voor initialen en typt een docent er
  // toch een keer een volledige naam in. Vervangen door "de leerling" vóór
  // verzending, na ontvangst van het voorstel weer lokaal terugzetten.
  const leerlingVervangbaar =
    mail.leerling.trim() && mail.leerling.trim() !== "uw kind" ? mail.leerling.trim() : "";
  const PLACEHOLDER = "de leerling";
  function vervangLeerling(tekst: string): string {
    if (!leerlingVervangbaar) return tekst;
    return tekst.split(leerlingVervangbaar).join(PLACEHOLDER);
  }
  function herstelLeerling(tekst: string): string {
    if (!leerlingVervangbaar) return tekst;
    return tekst.split(PLACEHOLDER).join(leerlingVervangbaar);
  }
  const privacy = privacyOuders(`${output.subject}\n${output.body}`);
  const mailto = [
    "mailto:?subject=",
    encodeURIComponent(output.subject),
    "&body=",
    encodeURIComponent(output.body),
  ].join("");
  const update = (key: keyof MailInput, value: string) => {
    setAiVoorstel(null);
    setMail({ ...mail, [key]: value } as MailInput);
  };
  return (
    <section className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-4 rounded-xl border-2 border-lijn bg-ivoor p-5">
        <label className="block text-base font-semibold text-marine">
          Aanleiding
          <select
            className={inputClass}
            value={mail.aanleiding}
            onChange={(event) => update("aanleiding", event.target.value)}
          >
            {AANLEIDINGEN.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </label>
        <Veld
          label="Aanhef"
          value={mail.aanhef}
          onChange={(value) => update("aanhef", value)}
        />
        <Veld
          label="Initialen of ‘uw kind’"
          value={mail.leerling}
          onChange={(value) => update("leerling", value)}
          placeholder="Bijvoorbeeld L.J."
        />
        {mail.leerling &&
          !valideerInitialen(mail.leerling) &&
          mail.leerling !== "uw kind" && (
            <p className="text-base text-fout">
              Gebruik alleen initialen, bijvoorbeeld L.J.
            </p>
          )}
        <Veld
          label="Vak"
          value={mail.vak}
          onChange={(value) => update("vak", value)}
        />
        <Veld
          label="Concrete observatie"
          value={mail.observatie}
          onChange={(value) => update("observatie", value)}
          multiline
        />
        <Veld
          label="Tweede observatie"
          value={mail.observatie2}
          onChange={(value) => update("observatie2", value)}
          multiline
        />
        <Veld
          label="Gewenste actie"
          value={mail.actie}
          onChange={(value) => update("actie", value)}
          multiline
        />
        {mail.aanleiding === "Schoolreis / activiteit info" && (
          <>
            <Veld
              label="Datum"
              value={mail.datum}
              onChange={(value) => update("datum", value)}
              placeholder="Bijvoorbeeld 12 oktober"
            />
            <Veld
              label="Locatie"
              value={mail.locatie}
              onChange={(value) => update("locatie", value)}
              placeholder="Bijvoorbeeld Museon Den Haag"
            />
            <Veld
              label="Vertrektijd"
              value={mail.tijd}
              onChange={(value) => update("tijd", value)}
              placeholder="Bijvoorbeeld 08.30 uur"
            />
            <Veld
              label="Wat meenemen"
              value={mail.meenemen}
              onChange={(value) => update("meenemen", value)}
              placeholder="Bijvoorbeeld een lunchpakket en regenjas"
            />
          </>
        )}
        {mail.aanleiding === "Reactie op boze mail (de-escalerend)" && (
          <Veld
            label="Belmomenten"
            value={mail.belmomenten}
            onChange={(value) => update("belmomenten", value)}
            placeholder="Bijvoorbeeld dinsdag om 15.30 uur"
          />
        )}
        <Veld
          label="Naam docent"
          value={mail.naam}
          onChange={(value) => update("naam", value)}
        />
      </div>
      <div>
        <OuderOutput
          titel="Mailtekst"
          onderwerp={output.subject}
          tekst={output.body}
          privacy={privacy}
          mailto={mailto}
        />
        <AiAssistPaneel
          taak="ouder_mail_verbeter"
          label="Verbeter met AI"
          onderwerp={vervangVoornamen(vervangLeerling(gegenereerd.subject))}
          tekst={vervangVoornamen(vervangLeerling(gegenereerd.body))}
          toon={`toon: ${mail.toon}`}
          disabledReden={privacy.blokkeer ? "Los eerst de privacyblokkade op." : null}
          onGebruik={(voorstel, aiOnderwerp) =>
            setAiVoorstel({
              subject: herstelLeerling(aiOnderwerp ?? gegenereerd.subject),
              body: herstelLeerling(voorstel),
            })
          }
        />
      </div>
    </section>
  );
}
