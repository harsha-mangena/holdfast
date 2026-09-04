import { createServerFn } from "@tanstack/react-start";
import { mailpitLatest, peekVerifyLink } from "./verify-mail.server";

export const stagingVerifyLink = createServerFn({ method: "POST" })
  .validator((input: { email: string }) => input)
  .handler(async ({ data }) => {
    const email = data.email.trim().toLowerCase();
    if (!email || !email.includes("@")) return { url: null as string | null, mail: null as { subject: string; text: string } | null };
    const mail = await mailpitLatest(email);
    return { url: peekVerifyLink(email), mail };
  });
