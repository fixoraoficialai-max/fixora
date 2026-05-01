import { fal } from "@fal-ai/client";

/** Configures the fal client with the API key from environment. Call once per server boot,
 *  but safe to call multiple times (idempotent). */
export function configureFal(): void {
  const key = process.env.FAL_API_KEY;
  if (!key) throw new Error("FAL_API_KEY is not configured");
  fal.config({ credentials: key });
}

export { fal };
