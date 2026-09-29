import { privacyGate, privacyGateUitleg } from "../src/lib/ai/privacy-gate";
import { assistOutputGuard, assistOutputGuardUitleg } from "../src/lib/ai/output-guard";
import {
  ASSIST_TAKEN,
  isAssistTaak,
  systeeminstructieVoor,
  type AssistTaak,
} from "../src/lib/ai/assist-tasks";
import { assistProviderBeschikbaar } from "../src/lib/ai/assist-provider";
import { magDoor } from "../src/lib/ai/rate-limit";

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

console.log("ai-tests: ok");
