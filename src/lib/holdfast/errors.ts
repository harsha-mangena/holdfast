import { createMiddleware } from "@tanstack/react-start";

const GENERIC = "Something failed on the board. Try again. If it repeats, refresh the page.";

function looksLikeCode(raw: string): boolean {
  return (
    raw.length > 180 ||
    raw.includes("\n    at ") ||
    /column |relation |SQLSTATE|postgres|undefined is not|is not a function|Cannot read|TypeError|ReferenceError|node_modules|workerSrc|InvalidPDF|Unexpected token|createServerFn|hydrat|ECONN|ETIMEDOUT|hf_[a-z_]+|vite\/|\/src\/|stack:|Failed to execute|json parse|SyntaxError/i.test(
      raw,
    )
  );
}

/** Postgres / fetch / JS guts → a sentence a superintendent can read. */
export function humanBoardError(err: unknown): Error {
  if (err instanceof Error && (err.name === "UnauthorizedError" || err.message === "Unauthorized")) {
    return err;
  }
  const raw = err instanceof Error ? err.message : String(err);

  if (/column "phone"/i.test(raw)) {
    return new Error("Phone numbers were missing on this board. Refresh once — we add the field automatically.");
  }
  if (/hf_pay_lines/i.test(raw) && /does not exist/i.test(raw)) {
    return new Error("The pay book was missing. Refresh once so we can set it up.");
  }
  if (/column .* does not exist/i.test(raw)) {
    return new Error("This board is missing a field. Refresh the page so we can update it.");
  }
  if (/relation .* does not exist/i.test(raw)) {
    return new Error("This board is missing a table. Refresh the page so we can rebuild it.");
  }
  if (/duplicate key|unique constraint/i.test(raw)) {
    return new Error("That is already on the board.");
  }
  if (/foreign key|violates/i.test(raw)) {
    return new Error("That sub or file is gone. Pick another and try again.");
  }
  if (/not-null constraint|null value/i.test(raw)) {
    return new Error("A required field was empty.");
  }
  if (/XAI_API_KEY|api key/i.test(raw)) {
    return new Error("Could not read the document. Type the fields or try the PDF again.");
  }
  if (/email.?not.?verif|verify your email|EMAIL_NOT_VERIFIED/i.test(raw)) {
    return new Error("Confirm the email we sent before you open the board.");
  }
  if (/InvalidPDF|PDF/i.test(raw) && looksLikeCode(raw)) {
    return new Error("That file is not a readable PDF. Try another copy.");
  }
  if (/Unauthorized|invalid origin|csrf/i.test(raw) && looksLikeCode(raw)) {
    return new Error("Sign in again, then retry.");
  }

  if (err instanceof Error && !looksLikeCode(raw)) return err;
  return new Error(GENERIC);
}

export function userFacing(err: unknown): string {
  return humanBoardError(err).message;
}

export const humanBoard = createMiddleware({ type: "function" }).server(async ({ next }) => {
  try {
    return await next();
  } catch (err) {
    throw humanBoardError(err);
  }
});
