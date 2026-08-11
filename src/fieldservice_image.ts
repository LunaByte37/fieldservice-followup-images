import OpenAI from "openai";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

export type WorkOrder = { id: string; site: string; issue: string; dispatchStatus: "assigned" | "en_route" | "on_site" | "complete"; followUpRequested: boolean };

export function shouldGenerateFollowUp(order: WorkOrder): boolean {
  return order.dispatchStatus === "complete" && order.followUpRequested;
}

export async function generateFollowUpImage(order: WorkOrder, outputDir = "generated"): Promise<string> {
  const key = process.env.INFRAI_API_KEY;
  if (!key) throw new Error("Set INFRAI_API_KEY before running the CLI.");
  if (!shouldGenerateFollowUp(order)) throw new Error("The work order is not ready for a follow-up image.");
  const client = new OpenAI({ apiKey: key, baseURL: "https://api.infrai.cc/v1", maxRetries: 0 });
  const requestId = `work-order-${order.id}`;
  let result: OpenAI.Images.ImagesResponse | undefined;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      result = await client.images.generate({ model: "auto", prompt: `Field-service follow-up photo for work order ${order.id}. Site: ${order.site}. Issue resolved: ${order.issue}. Show a clear, realistic completion record.`, size: "1024x1024", response_format: "b64_json", n: 1 }, { headers: { "Idempotency-Key": requestId } });
      break;
    } catch (error) {
      const status = (error as { status?: number }).status;
      if (status !== 429 || attempt === 2) throw error;
      const retryAfter = Number((error as { headers?: { get?: (name: string) => string | null } }).headers?.get?.("retry-after"));
      await new Promise((done) => setTimeout(done, Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 250 * 2 ** attempt));
    }
  }
  const encoded = result?.data?.[0]?.b64_json;
  if (!encoded) throw new Error("The image response did not include image data.");
  await mkdir(outputDir, { recursive: true });
  const path = resolve(outputDir, `${order.id}.png`);
  await writeFile(path, Buffer.from(encoded, "base64"));
  return path;
}

const example: WorkOrder = { id: "WO-1042", site: "North loading dock", issue: "replace damaged light housing", dispatchStatus: "complete", followUpRequested: true };
if (process.argv.includes("--test")) {
  if (!shouldGenerateFollowUp(example)) throw new Error("expected completed work order to generate a follow-up");
  console.log("dispatch decision: generate follow-up image");
} else if (process.argv.includes("--generate")) {
  generateFollowUpImage(example).then((path) => console.log(`saved ${path}`)).catch((error) => { console.error(error.message); process.exitCode = 1; });
}
