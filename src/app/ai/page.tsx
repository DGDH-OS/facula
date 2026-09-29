import type { Metadata } from "next";
import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";

export const metadata: Metadata = {
  title: "AI in Facula: hoe wij het veilig houden",
  description:
    "Welke Facula-functies AI gebruiken, wat er wel en niet naar het model gaat, " +
    "de privacy-poort vooraf, en hoe Facula omgaat met de Europese AI-verordening.",
};

export default function AiPage() {
  return (
    <>
      <SiteHeader />
      <main className="flex-1 px-6 py-24">
        <div className="mx-auto max-w-3xl">
          <h1 className="font-display text-4xl text-marine">
            AI in Facula: hoe wij het veilig houden
          </h1>
          <p className="mt-4 text-base text-tekst-zacht">
            Laatst bijgewerkt: 29 september 2026
          </p>
          <p className="mt-6 text-base leading-relaxed text-tekst">
            Facula gebruikt AI om je werk te versnellen, nooit om het van je
            over te nemen. Deze pagina legt uit welke functies AI gebruiken,
            wat er wel en niet naar het model gaat, en hoe dat zich verhoudt
            tot de Europese AI-verordening.
          </p>

          <div className="mt-10 space-y-8">
            <section>
              <h2 className="font-display text-xl text-marine">
                Welke functies AI gebruiken
              </h2>
              <ul className="mt-2 space-y-2 text-base leading-relaxed text-tekst">
                <li>
                  • <strong>Lesgenerator</strong>: genereert een volledige les
                  op basis van je leerdoel.
                </li>
                <li>
                  • <strong>Toetsgenerator</strong>: genereert toetsvragen op
                  basis van dezelfde leerdoelen als de les.
                </li>
                <li>
                  • <strong>&quot;Verbeter met AI&quot;-knoppen</strong> in de
                  ouder-, nakijk-, toetsweek- en rapportmodule: een optioneel
                  voorstel dat een tekst herformuleert die jij al hebt
                  geschreven of die Facula al deterministisch heeft opgesteld.
                  Deze knop staat nooit aan zonder dat jij erop klikt.
                </li>
              </ul>
              <p className="mt-2 text-base leading-relaxed text-tekst">
                De coachmodule gebruikt bewust geen vrije AI-generatie: die
                beantwoordt vragen uit een vooraf samengestelde, redactioneel
                gecontroleerde kennisbank, zodat elk antwoord herleidbaar
                blijft naar een bron in plaats van door een model verzonnen.
              </p>
            </section>

            <section>
              <h2 className="font-display text-xl text-marine">
                Wat er naar het model gaat, en wat niet
              </h2>
              <p className="mt-2 text-base leading-relaxed text-tekst">
                Alleen de tekst die nodig is voor de gevraagde taak gaat naar
                het model: bijvoorbeeld je leerdoel, of de tekst die je met
                &quot;Verbeter met AI&quot; wilt laten herformuleren. Vóór
                verzending controleert Facula die tekst op e-mailadressen,
                telefoonnummers, BSN-achtige nummers, medische of
                diagnose-termen en volledige namen. Staat een van die dingen
                erin, dan gaat er niets naar het model en zie je een uitleg
                welk deel je moet aanpassen.
              </p>
              <p className="mt-2 text-base leading-relaxed text-tekst">
                Facula bewaart geen aparte kopie van wat naar het model
                gestuurd is, en logt de inhoud nergens: alleen welke taak
                het was, hoe lang het duurde en of het lukte. De
                gegenereerde les, toets of tekst zelf sla je zelf op, in je
                eigen account, zoals bij elk ander onderdeel van Facula.
              </p>
            </section>

            <section>
              <h2 className="font-display text-xl text-marine">
                Waar de verwerking plaatsvindt
              </h2>
              <p className="mt-2 text-base leading-relaxed text-tekst">
                Facula gebruikt Google Vertex AI (Gemini-model) via een
                Europees endpoint (regio europe-west4, EU). Volgens de
                voorwaarden van Google Cloud wordt hier niet mee getraind op
                de eigen AI-modellen van Google. Meer over deze subverwerker
                staat in onze{" "}
                <Link
                  href="/privacy"
                  className="font-semibold text-marine underline underline-offset-4"
                >
                  privacyverklaring
                </Link>
                .
              </p>
            </section>

            <section>
              <h2 className="font-display text-xl text-marine">
                Jij beslist, altijd
              </h2>
              <p className="mt-2 text-base leading-relaxed text-tekst">
                Elk AI-voorstel verschijnt naast of onder het origineel,
                bewerkbaar, met een knop om het voorstel te gebruiken en een
                knop om terug te gaan naar het origineel. Facula neemt nooit
                automatisch iets over. Het model mag bovendien nooit zelf een
                cijfer, beoordeling, niveau-advies of diagnose toevoegen die
                niet al letterlijk in jouw eigen tekst stond: dit is een
                technisch afgedwongen regel, geen belofte. Komt zoiets toch
                voor in wat het model teruggeeft, dan blokkeert Facula dat
                voorstel en toont het niet.
              </p>
            </section>

            <section>
              <h2 className="font-display text-xl text-marine">
                De Europese AI-verordening
              </h2>
              <p className="mt-2 text-base leading-relaxed text-tekst">
                De AI-verordening (Verordening (EU) 2024/1689) vraagt in
                artikel 50 dat wie AI-gegenereerde inhoud onder ogen krijgt,
                dat kan weten. Elk resultaat draagt daarom op het scherm en
                in het gedownloade bestand de vermelding dat het met AI is
                gemaakt, en waar technisch mogelijk staat dat ook in de
                documenteigenschappen van het bestand zelf.
              </p>
              <p className="mt-2 text-base leading-relaxed text-tekst">
                Onze eigen inschatting is dat Facula in de huidige vorm niet
                kwalificeert als hoog-risico AI-systeem onder Annex III
                (onderwijs): Facula bepaalt geen toelating tot een
                onderwijsinstelling, beoordeelt geen leerresultaten, bepaalt
                geen onderwijsniveau, en monitort geen toetsgedrag. De
                toets- en lesgenerator maken content aan, ze kijken niets na
                en koppelen geen cijfer of leerpad aan een leerling. Dit is
                een eigen inschatting op basis van de wettekst en publiek
                beschikbare toelichting, geen formele classificatie door een
                jurist of notified body. Verandert een toekomstige functie
                dit (bijvoorbeeld automatisch nakijken met een cijferadvies),
                dan hoort deze inschatting opnieuw beoordeeld te worden.
              </p>
            </section>

            <section>
              <h2 className="font-display text-xl text-marine">Contact</h2>
              <p className="mt-2 text-base leading-relaxed text-tekst">
                Vragen over hoe Facula AI gebruikt? Mail naar{" "}
                <a
                  href="mailto:info@dgdh-os.com"
                  className="font-semibold text-marine underline underline-offset-4"
                >
                  info@dgdh-os.com
                </a>
                .
              </p>
            </section>
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
