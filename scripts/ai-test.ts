import {
  privacyGate,
  privacyGateUitleg,
  normaliseerTekst,
  comprimeerVoorDetectie,
} from "../src/lib/ai/privacy-gate";
import { assistOutputGuard, assistOutputGuardUitleg } from "../src/lib/ai/output-guard";
import {
  ASSIST_TAKEN,
  isAssistTaak,
  systeeminstructieVoor,
  type AssistTaak,
} from "../src/lib/ai/assist-tasks";
import { assistProviderBeschikbaar } from "../src/lib/ai/assist-provider";
import { magDoor, LESSEN_MAX_PER_MINUUT } from "../src/lib/ai/rate-limit";
import { zelfdeOrigin } from "../src/lib/validation";
import { maakFeedback } from "../src/lib/nakijken/feedback";
import { nieuwCriterium } from "../src/lib/nakijken/rubric";
import type { Leerling, Niveau } from "../src/lib/nakijken/types";
import { bouwAssistBody } from "../src/lib/ai/assist-payload";
import { readFileSync } from "node:fs";

// Geen netwerkaanroep in dit bestand: alle geteste functies zijn puur of
// lezen alleen process.env, en genereerAssistVoorstel() wordt hier bewust
// niet aangeroepen.

// 1. privacy-gate blokkeert e-mail, telefoon, diagnose-termen en volledige namen.
const emailCheck = privacyGate("Mail me op docent@school.nl over dit voorval.");
if (emailCheck.ok) throw new Error("privacyGate blokkeert geen e-mailadres");

const telefoonCheck = privacyGate("Bel me op 06 12345678 als het niet lukt.");
if (telefoonCheck.ok) throw new Error("privacyGate blokkeert geen telefoonnummer");

const diagnoseCheck = privacyGate("De leerling heeft een ADHD-diagnose gekregen.");
if (diagnoseCheck.ok) throw new Error("privacyGate blokkeert geen diagnose-term");

const naamCheck = privacyGate("Sanne Jansen deed goed mee tijdens de les.");
if (naamCheck.ok) throw new Error("privacyGate blokkeert geen volledige naam");

const bsnCheck = privacyGate("Het nummer 123456789 hoort bij dit dossier.");
if (bsnCheck.ok) throw new Error("privacyGate blokkeert geen BSN-achtig nummer");

if (!privacyGateUitleg(emailCheck.redenen).includes("e-mailadres"))
  throw new Error("privacyGateUitleg noemt de reden niet");

// 2. Toegestane invoer passeert.
const schoonCheck = privacyGate("De leerling deed goed mee en stelde een vraag over de casus.");
if (!schoonCheck.ok) throw new Error("privacyGate blokkeert onterecht schone tekst");
if (schoonCheck.redenen.length !== 0) throw new Error("privacyGate geeft redenen bij schone tekst");

// Initialen mogen niet als volledige naam worden gezien.
const initialenCheck = privacyGate("L.J. deed goed mee tijdens de les.");
if (!initialenCheck.ok) throw new Error("privacyGate blokkeert onterecht op initialen");

for (const naam of ["Sanne", "Sem", "Ruben", "Mohamed"]) {
  const check = privacyGate(`${naam} is ziek.`);
  if (check.ok) throw new Error(`privacyGate laat voornaam ${naam} door`);
  const body = bouwAssistBody({
    taak: "ouder_mail_verbeter",
    tekst: `${naam} is ziek.`,
    onderwerp: `Update over ${naam}`,
  });
  const payload = JSON.stringify(body);
  if (new RegExp(naam, "i").test(payload)) {
    throw new Error(`bekende naam ${naam} zit in assist payload`);
  }
}

// 3. output-guard weigert een verzonnen cijfer/oordeel dat niet in de invoer stond.
const invoerZonderCijfer = "De leerling werkte rustig door en stelde een goede vraag.";
const outputMetVerzonnenCijfer = "De leerling werkte rustig door en verdient een 8.";
const guardMetCijfer = assistOutputGuard(invoerZonderCijfer, outputMetVerzonnenCijfer);
if (guardMetCijfer.ok) throw new Error("output-guard mist een verzonnen cijfer");
if (!assistOutputGuardUitleg(guardMetCijfer.gevondenWoorden).includes("cijfer"))
  throw new Error("assistOutputGuardUitleg mist het woord cijfer");

const outputMetVerzonnenOordeel = "De leerling werkte rustig door en presteert onvoldoende.";
const guardMetOordeel = assistOutputGuard(invoerZonderCijfer, outputMetVerzonnenOordeel);
if (guardMetOordeel.ok) throw new Error("output-guard mist een verzonnen oordeel");

// Cijfer dat al letterlijk in de invoer stond (bijv. door de docent zelf
// getypt) mag niet alsnog blokkeren.
const invoerMetCijfer = "De leerling haalde een 8 voor het proefwerk.";
const outputZelfdeCijfer = "De leerling haalde een 8 voor het proefwerk en werkte netjes.";
const guardOk = assistOutputGuard(invoerMetCijfer, outputZelfdeCijfer);
if (!guardOk.ok) throw new Error("output-guard blokkeert onterecht een cijfer uit de eigen invoer");

// 4. taak-enum weigert een onbekende taak.
if (isAssistTaak("vrije_prompt")) throw new Error("isAssistTaak accepteert een onbekende taak");
if (isAssistTaak(undefined)) throw new Error("isAssistTaak accepteert undefined");
for (const taak of ASSIST_TAKEN) {
  if (!isAssistTaak(taak)) throw new Error(`isAssistTaak wijst geldige taak af: ${taak}`);
  const instructie = systeeminstructieVoor(taak as AssistTaak);
  if (!instructie.trim()) throw new Error(`Geen systeeminstructie voor taak ${taak}`);
  if (!/cijfer|beoordeling/.test(instructie))
    throw new Error(`Systeeminstructie voor ${taak} mist de cijfer/oordeel-regel`);
}

// 5. AI niet beschikbaar geeft een nette fallback (geen netwerkaanroep nodig
// om dit te testen: assistProviderBeschikbaar() leest alleen env-variabelen).
const oorspronkelijkeProvider = process.env.FACULA_AI_PROVIDER;
const oorspronkelijkProjectId = process.env.GCP_PROJECT_ID;
try {
  process.env.FACULA_AI_PROVIDER = "template";
  delete process.env.GCP_PROJECT_ID;
  if (assistProviderBeschikbaar())
    throw new Error("assistProviderBeschikbaar() geeft ten onrechte true bij FACULA_AI_PROVIDER=template");

  delete process.env.FACULA_AI_PROVIDER;
  delete process.env.GCP_PROJECT_ID;
  if (assistProviderBeschikbaar())
    throw new Error("assistProviderBeschikbaar() geeft ten onrechte true zonder GCP_PROJECT_ID");

  process.env.GCP_PROJECT_ID = "test-project";
  if (!assistProviderBeschikbaar())
    throw new Error("assistProviderBeschikbaar() geeft ten onrechte false met GCP_PROJECT_ID gezet");
} finally {
  if (oorspronkelijkeProvider === undefined) delete process.env.FACULA_AI_PROVIDER;
  else process.env.FACULA_AI_PROVIDER = oorspronkelijkeProvider;
  if (oorspronkelijkProjectId === undefined) delete process.env.GCP_PROJECT_ID;
  else process.env.GCP_PROJECT_ID = oorspronkelijkProjectId;
}

// 6. Eenvoudige rate-limit: eerst toegestaan, daarna geblokkeerd binnen het venster,
// een andere gebruiker blijft onafhankelijk.
const gebruikerA = `test-gebruiker-a-${Date.now()}`;
const gebruikerB = `test-gebruiker-b-${Date.now()}`;
let geblokkeerdGezien = false;
for (let i = 0; i < 15; i++) {
  const resultaat = magDoor(gebruikerA);
  if (!resultaat.ok) {
    geblokkeerdGezien = true;
    break;
  }
}
if (!geblokkeerdGezien) throw new Error("magDoor blokkeert nooit binnen het venster");
if (!magDoor(gebruikerB).ok) throw new Error("magDoor laat een andere gebruiker onterecht wachten");

const lesUser = `test-lessen-${Date.now()}`;
for (let i = 0; i < LESSEN_MAX_PER_MINUUT; i++) {
  if (!magDoor(lesUser, { maxPerVenster: LESSEN_MAX_PER_MINUUT, sleutel: "lessons" }).ok) {
    throw new Error("lessen-limiet blokkeert te vroeg");
  }
}
if (magDoor(lesUser, { maxPerVenster: LESSEN_MAX_PER_MINUUT, sleutel: "lessons" }).ok) {
  throw new Error("lessen-limiet van 5 per minuut blokkeert niet");
}
if (!magDoor(lesUser).ok) {
  throw new Error("assist-emmer mag niet dezelfde teller als lessen delen");
}

// 7. zelfdeOrigin: CSRF-controle voor POST /api/ai/assist.
function verzoek(origin: string | null, host: string | null): Request {
  const headers = new Headers();
  if (origin) headers.set("origin", origin);
  if (host) headers.set("host", host);
  return new Request("https://facula.app/api/ai/assist", { method: "POST", headers });
}
if (!zelfdeOrigin(verzoek("https://facula.app", "facula.app")))
  throw new Error("zelfdeOrigin wijst een gelijke origin/host onterecht af");
if (zelfdeOrigin(verzoek("https://kwaadaardig.example", "facula.app")))
  throw new Error("zelfdeOrigin accepteert een andere origin dan de host");
if (zelfdeOrigin(verzoek(null, "facula.app")))
  throw new Error("zelfdeOrigin accepteert een ontbrekende origin");
if (zelfdeOrigin(verzoek("niet-een-url", "facula.app")))
  throw new Error("zelfdeOrigin accepteert een ongeldige origin-header");

const lessonsBron = readFileSync("src/app/api/lessons/route.ts", "utf8");
const lessonsPost = lessonsBron.slice(lessonsBron.indexOf("export async function POST"));
const lessonsEersteCheck =
  /^export async function POST\(request: NextRequest\) \{\s*if \(!zelfdeOrigin\(request\)\)/;
if (!lessonsEersteCheck.test(lessonsPost)) {
  throw new Error("lessons-route mist Origin-check als eerste stap");
}
if (!lessonsBron.includes("LESSEN_MAX_PER_MINUUT") || !lessonsBron.includes('sleutel: "lessons"')) {
  throw new Error("lessons-route mist per-user rate-limit vóór de modelaanroep");
}

const paneelBron = readFileSync("src/components/ai/AiAssistPaneel.tsx", "utf8");
if (paneelBron.includes("aria-disabled")) {
  throw new Error("AiAssistPaneel gebruikt nog aria-disabled");
}
if (!paneelBron.includes("disabled={geblokkeerd || status === \"bezig\"}")) {
  throw new Error("AiAssistPaneel mist native disabled");
}
if (!paneelBron.includes("aria-describedby={geblokkeerd ? redenId : undefined}")) {
  throw new Error("AiAssistPaneel mist aria-describedby op de reden");
}
if (!paneelBron.includes("bouwAssistBody")) {
  throw new Error("AiAssistPaneel stuurt tekst zonder voornamen-vervanging");
}

const aiPagina = readFileSync("src/app/ai/page.tsx", "utf8");
if (!aiPagina.includes("alleen voor het AI-voorstel")) {
  throw new Error("/ai zegt niet dat AI-markering alleen voor assist-voorstellen geldt");
}
if (aiPagina.includes("Elk resultaat draagt daarom")) {
  throw new Error("/ai markeert nog elke output als AI");
}

// 8. privacyGate: omzeilingen die BLOCK 2 moet dichten.
const zeroWidthEmail = privacyGate("Mail​mij​ op jan​@​school.nl vandaag nog.");
if (zeroWidthEmail.ok) throw new Error("privacyGate mist een e-mailadres met zero-width tekens erin");

const gespeldeEmail = privacyGate("Je kunt mailen naar jan [at] school punt nl voor meer info.");
if (gespeldeEmail.ok) throw new Error("privacyGate mist een gespelde e-mailobfuscatie (at/punt)");

const nbspTelefoon = privacyGate("Bel 06 12 34 56 78 gerust terug.");
if (nbspTelefoon.ok) throw new Error("privacyGate mist een telefoonnummer met NBSP tussen de cijfers");

const uitElkaarGetrokkenTerm = privacyGate("De leerling is d y s l e x i e gediagnosticeerd volgens ouders.");
if (uitElkaarGetrokkenTerm.ok)
  throw new Error("privacyGate mist een uit elkaar getrokken medische term");

const homoglyfeTerm = privacyGate("Deze leerling heeft АDHD volgens het dossier."); // Cyrillische А
if (homoglyfeTerm.ok) throw new Error("privacyGate mist een medische term met een Cyrillische homoglyph");

const aanhefMetNaam = privacyGate("Beste Sem, hier is je feedback over het proefwerk van gisteren.");
if (aanhefMetNaam.ok) throw new Error("privacyGate mist een aanhef gevolgd door een éénnaams-naam");

const ouderAanhef = privacyGate("Geachte heer/mevrouw Jansen, hierbij een update over de klas.");
if (ouderAanhef.ok) throw new Error("privacyGate mist een formele aanhef met achternaam");

// normaliseerTekst/comprimeerVoorDetectie zijn zelf ook getest, niet alleen via privacyGate.
if (!normaliseerTekst("jan​@school.nl").includes("@"))
  throw new Error("normaliseerTekst haalt geen zero-width tekens weg");
if (normaliseerTekst("a b") !== "a b")
  throw new Error("normaliseerTekst zet een NBSP niet om naar een gewone spatie");
if (comprimeerVoorDetectie("d y s l e x i e") !== "dyslexie")
  throw new Error("comprimeerVoorDetectie voegt uit elkaar getrokken letters niet samen");

// 9. output-guard: nieuwe categorieën die BLOCK 3 moet dichten.
const invoerZonderNiveau = "De leerling werkte netjes door tijdens de toets.";

const outputMetNiveau = "De leerling werkte netjes door en zit duidelijk op havo-niveau.";
if (assistOutputGuard(invoerZonderNiveau, outputMetNiveau).ok)
  throw new Error("output-guard mist een verzonnen schoolniveau (havo)");

const outputMetOordeel = "De leerling werkte netjes door, het resultaat is gewoon slecht.";
if (assistOutputGuard(invoerZonderNiveau, outputMetOordeel).ok)
  throw new Error("output-guard mist een verzonnen oordeelwoord (slecht)");

const outputMetGetalWoord = "De leerling verdient een zes voor deze inzet.";
if (assistOutputGuard(invoerZonderNiveau, outputMetGetalWoord).ok)
  throw new Error("output-guard mist een cijfer dat als woord geschreven is (zes)");

const outputMetPercentage = "De leerling scoorde 80% op de toets.";
if (assistOutputGuard(invoerZonderNiveau, outputMetPercentage).ok)
  throw new Error("output-guard mist een percentage dat niet in de invoer stond");

const outputMetBreuk = "De leerling haalde 7/10 op de opdracht.";
if (assistOutputGuard(invoerZonderNiveau, outputMetBreuk).ok)
  throw new Error("output-guard mist een breuk-score die niet in de invoer stond");

const outputMetPunten = "De leerling haalde 18 punten voor het werkstuk.";
if (assistOutputGuard(invoerZonderNiveau, outputMetPunten).ok)
  throw new Error("output-guard mist een puntenscore die niet in de invoer stond");

if (assistOutputGuard(invoerZonderNiveau, "De leerling scoorde 12.").ok)
  throw new Error("output-guard laat 12 door");
if (assistOutputGuard(invoerZonderNiveau, "Eindcijfer 42").ok)
  throw new Error("output-guard laat 42 door");
if (assistOutputGuard(invoerZonderNiveau, "Score 100").ok)
  throw new Error("output-guard laat 100 door");
if (assistOutputGuard(invoerZonderNiveau, "Cijfer 12,5").ok)
  throw new Error("output-guard laat 12,5 door");
if (assistOutputGuard(invoerZonderNiveau, "Score ١٢").ok)
  throw new Error("output-guard laat unicode-cijfers door");
if (assistOutputGuard(invoerZonderNiveau, "Dat is honderd procent inzet.").ok)
  throw new Error("output-guard laat honderd of procent door");
if (assistOutputGuard(invoerZonderNiveau, "Dat is nul extra.").ok)
  throw new Error("output-guard laat nul door");
if (!assistOutputGuard("Score 12,5 in de toets", "De leerling had 12,5 in de toets.").ok)
  throw new Error("output-guard blokkeert 12,5 die al in de invoer stond");

const outputMetDiagnose = "De leerling reageerde rustig, past bij het adhd-profiel.";
if (assistOutputGuard(invoerZonderNiveau, outputMetDiagnose).ok)
  throw new Error("output-guard mist een verzonnen diagnose-term (adhd)");

// "goed"/"sterk" mogen alleen blokkeren als ze niet al in de invoer stonden.
const invoerMetGoed = "De leerling deed het goed vandaag en hielp een klasgenoot.";
const outputZelfdeGoed = "De leerling deed het goed vandaag en was behulpzaam.";
if (!assistOutputGuard(invoerMetGoed, outputZelfdeGoed).ok)
  throw new Error("output-guard blokkeert onterecht 'goed' dat al in de eigen invoer stond");

// 10. nakijken-feedback bevat nooit een cijfer of losse punten: alleen
// initialen en kwalitatieve rubric-zinnen gaan naar de AI-assistlaag.
const criterium = nieuwCriterium("Inhoud");
const rubricVoorFeedback = { titel: "Betoog", criteria: [criterium], maxPunten: 8, cesuur: 55 };
const leerlingVoorFeedback: Leerling = {
  id: "1",
  initialen: "L.J.",
  keuzes: { [criterium.id]: 2 as Niveau },
  notitie: "werkte rustig door",
};
const feedbackVoorAi = maakFeedback(rubricVoorFeedback, leerlingVoorFeedback);
if (/\d/.test(feedbackVoorAi))
  throw new Error("maakFeedback bevat een cijfer; dat mag nooit naar de AI-assistlaag gaan");
if (/\bpunten\b/i.test(feedbackVoorAi))
  throw new Error("maakFeedback noemt punten; dat mag nooit naar de AI-assistlaag gaan");

console.log("ai-tests: ok");
