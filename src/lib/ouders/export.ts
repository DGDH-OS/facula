import { Document, Footer, HeadingLevel, Packer, Paragraph, TextRun } from "docx";
import { AI_MELDING_EXPORT } from "../ai-transparantie";
import { privacyOuders } from "./templates";
export async function downloadOudersWord(titel: string, tekst: string) {
  const privacy = privacyOuders(tekst);
  if (privacy.blokkeer) return privacy;
  const doc = new Document({
    // Machineleesbare markering (AI-verordening art. 50 lid 2): deze tekst kan
    // met AI-assist zijn verbeterd (zie de "Verbeter met AI"-knop), dus de
    // documenteigenschappen en een voettekst dragen dat altijd mee.
    description: AI_MELDING_EXPORT,
    subject: AI_MELDING_EXPORT,
    creator: "Facula (DGDH OS)",
    sections: [{
      footers: {
        default: new Footer({
          children: [
            new Paragraph({
              children: [new TextRun({ text: AI_MELDING_EXPORT, italics: true, size: 16 })],
            }),
          ],
        }),
      },
      children: [
        new Paragraph({ text: titel, heading: HeadingLevel.HEADING_1 }),
        ...tekst.split("\n").map((regel) => new Paragraph({ children: [new TextRun(regel)] })),
      ],
    }],
  });
  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a"); link.href = url; link.download = `${titel.toLowerCase().replaceAll(" ", "-")}.docx`; link.click(); URL.revokeObjectURL(url);
  return privacy;
}
