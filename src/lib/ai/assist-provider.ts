import { haalAccessToken } from "./auth";
import { providerNaamUitEnv } from "./provider";
import type { AssistTaak } from "./assist-tasks";

/**
 * Vertex AI-aanroep voor de AI-assistlaag (POST /api/ai/assist): korte
 * herformuleringstaken, geen lesgeneratie. Eigen, lichtere aanroep dan
 * vertex.ts (kortere timeout, kleiner schema) omdat een assist-voorstel één
 * alinea is, geen hele les.
 */

const EU_LOCATIE = "eu";
const EU_HOST = "https://aiplatform.eu.rep.googleapis.com";
const STANDAARD_TIMEOUT_MS = 20_000;
const MAX_OUTPUT_TOKENS = 2_048;
const STANDAARD_MODEL = "gemini-2.5-flash";
const STANDAARD_LOCATIE = "europe-west4";

const ASSIST_RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    onderwerp: { type: "STRING", description: "Alleen invullen als de taak een onderwerp vraagt." },
    voorstel: { type: "STRING", description: "Het herschreven voorstel, platte tekst." },
  },
  required: ["voorstel"],
} as const;

export interface AssistVoorstel {
  onderwerp: string | null;
  voorstel: string;
}

function projectId(): string | null {
  return process.env.GCP_PROJECT_ID ?? null;
}

/** Null zodra er bewust geen AI is (FACULA_AI_PROVIDER=template) of GCP_PROJECT_ID ontbreekt. */
export function assistProviderBeschikbaar(): boolean {
  return providerNaamUitEnv() !== "template" && Boolean(projectId());
}

function endpointVoor(model: string, location: string, project: string): string {
  const isEu = location === EU_LOCATIE;
  const host = isEu ? EU_HOST : "https://" + location + "-aiplatform.googleapis.com";
  const apiVersie = isEu ? "v1beta1" : "v1";
  return (
    host + "/" + apiVersie + "/projects/" + project + "/locations/" + location +
    "/publishers/google/models/" + model + ":generateContent"
  );
}

interface VertexResponse {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string; thought?: boolean }> };
    finishReason?: string;
  }>;
  promptFeedback?: { blockReason?: string };
}

function pakJsonTekst(data: VertexResponse): string {
  const kandidaat = data.candidates?.[0];
  if (!kandidaat) {
    const reden = data.promptFeedback?.blockReason;
    throw new Error(reden ? "Model gaf geen antwoord, reden: " + reden : "Model gaf geen antwoord.");
  }
  if (kandidaat.finishReason && kandidaat.finishReason !== "STOP") {
    throw new Error("Model stopte met reden " + kandidaat.finishReason + ".");
  }
  const tekst = (kandidaat.content?.parts ?? [])
    .filter((part) => part.thought !== true && typeof part.text === "string")
    .map((part) => part.text as string)
    .join("");
  if (!tekst.trim()) throw new Error("Model gaf een leeg antwoord.");
  return tekst;
}

/**
 * Genereert één AI-voorstel voor een vaste taak. Gooit een Error bij een
 * timeout, een HTTP-fout van Vertex, of een leeg/ongeldig antwoord; de
 * aanroeper (de route) vangt dit af tot een nette 'AI niet beschikbaar'.
 *
 * `taak` wordt niet inhoudelijk gebruikt (de systeeminstructie/prompt komen
 * al van de aanroeper), maar staat in de signatuur zodat een toekomstige
 * taak-specifieke modelkeuze hier geen nieuwe functie nodig heeft.
 */
export async function genereerAssistVoorstel(
  _taak: AssistTaak,
  systeeminstructie: string,
  gebruikersprompt: string
): Promise<AssistVoorstel> {
  const project = projectId();
  if (!project) throw new Error("GCP_PROJECT_ID ontbreekt.");

  const model = process.env.FACULA_AI_ASSIST_MODEL || STANDAARD_MODEL;
  const location = process.env.FACULA_AI_ASSIST_LOCATION || STANDAARD_LOCATIE;
  const timeoutMs = Number(process.env.FACULA_AI_ASSIST_TIMEOUT_MS) || STANDAARD_TIMEOUT_MS;

  const token = await haalAccessToken();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(endpointVoor(model, location, project), {
      method: "POST",
      headers: {
        Authorization: "Bearer " + token,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systeeminstructie }] },
        contents: [{ role: "user", parts: [{ text: gebruikersprompt }] }],
        generationConfig: {
          temperature: 0.5,
          maxOutputTokens: MAX_OUTPUT_TOKENS,
          responseMimeType: "application/json",
          responseSchema: ASSIST_RESPONSE_SCHEMA,
          thinkingConfig: { thinkingBudget: 512 },
        },
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const body = (await response.text()).slice(0, 300);
      throw new Error("Vertex AI gaf HTTP " + response.status + ": " + body);
    }

    const data = (await response.json()) as VertexResponse;
    const parsed = JSON.parse(pakJsonTekst(data)) as { onderwerp?: string; voorstel?: string };
    if (typeof parsed.voorstel !== "string" || !parsed.voorstel.trim()) {
      throw new Error("Model gaf geen bruikbaar voorstel terug.");
    }
    return { onderwerp: parsed.onderwerp?.trim() || null, voorstel: parsed.voorstel };
  } finally {
    clearTimeout(timer);
  }
}
