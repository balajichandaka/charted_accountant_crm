import { z } from "zod";

export type ActionResult<T = void> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

/** Validate input with a Zod schema, returning a flattened first error message. */
export function parseInput<T>(
  schema: z.ZodType<T>,
  input: unknown
): { ok: true; data: T } | { ok: false; error: string } {
  const parsed = schema.safeParse(input);
  if (parsed.success) return { ok: true, data: parsed.data };
  const first =
    parsed.error.issues[0]?.message ?? "Invalid input. Please check the form.";
  return { ok: false, error: first };
}

/** Wrap an action body so thrown errors become a clean ActionResult. */
export async function runAction<T>(
  fn: () => Promise<T>
): Promise<ActionResult<T>> {
  try {
    const data = await fn();
    return { ok: true, data };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Something went wrong.";
    return { ok: false, error: message };
  }
}
