import * as pdfjs from "pdfjs-dist";

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();

const MAX_DATA_URL = 900_000;

function fitJpeg(canvas: HTMLCanvasElement): string {
  for (const q of [0.78, 0.64, 0.5, 0.4]) {
    const url = canvas.toDataURL("image/jpeg", q);
    if (url.length <= MAX_DATA_URL) return url;
  }
  const small = document.createElement("canvas");
  small.width = Math.round(canvas.width * 0.7);
  small.height = Math.round(canvas.height * 0.7);
  small.getContext("2d")?.drawImage(canvas, 0, 0, small.width, small.height);
  return small.toDataURL("image/jpeg", 0.5);
}

export async function pdfToEvidence(data: ArrayBuffer): Promise<{ text: string; images: string[] }> {
  const doc = await pdfjs.getDocument({ data }).promise;
  const textParts: string[] = [];
  const images: string[] = [];
  const max = Math.min(doc.numPages, 2);
  for (let i = 1; i <= max; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const raw = content.items.map((item) => ("str" in item ? item.str : "")).join(" ");
    textParts.push(raw);
    const viewport = page.getViewport({ scale: 1.8 });
    const canvas = document.createElement("canvas");
    canvas.width = Math.min(1400, Math.round(viewport.width));
    canvas.height = Math.round((viewport.height * canvas.width) / viewport.width);
    const ctx = canvas.getContext("2d");
    if (!ctx) continue;
    const draw = page.getViewport({ scale: canvas.width / viewport.width });
    await page.render({ canvasContext: ctx, viewport: draw, canvas }).promise;
    images.push(fitJpeg(canvas));
  }
  return { text: textParts.join("\n"), images };
}

export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result ?? "");
      const comma = result.indexOf(",");
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}
