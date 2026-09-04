export type CarrierKeys = { sid: string; token: string; from: string };

function e164(raw: string): string | null {
  const d = raw.replace(/[^\d+]/g, "");
  if (d.startsWith("+") && d.length >= 11) return d;
  const digits = d.replace(/\D/g, "");
  if (digits.length === 10) return "+1" + digits;
  if (digits.length === 11 && digits.startsWith("1")) return "+" + digits;
  return null;
}

function twimlSay(script: string): string {
  const say = script
    .replace(/&/g, "&")
    .replace(/</g, "<")
    .replace(/>/g, ">")
    .slice(0, 3500);
  return "<Response><Say voice=\"Polly.Matthew\">" + say + "</Say></Response>";
}

export function envCarrier(): CarrierKeys | null {
  const sid = process.env.TWILIO_ACCOUNT_SID?.trim() ?? "";
  const token = process.env.TWILIO_AUTH_TOKEN?.trim() ?? "";
  const from = process.env.TWILIO_FROM?.trim() ?? "";
  if (!sid || !token || !from) return null;
  return { sid, token, from };
}

export async function placePstn(
  phone: string,
  script: string,
  keys: CarrierKeys | null,
): Promise<{ mode: "pstn" | "preview"; detail: string }> {
  const to = e164(phone);
  if (!to) return { mode: "preview", detail: "That number cannot be dialed. Fix it on Subs." };
  if (/^\+1555/.test(to)) {
    return { mode: "preview", detail: "555 is a sample number. The agent speaks here. Put a real sub phone on Subs to ring out." };
  }
  if (!keys) {
    return {
      mode: "preview",
      detail: "No phone carrier yet. The agent speaks here. Open Office and paste your Twilio SID, auth token, and from-number.",
    };
  }
  const from = e164(keys.from) ?? keys.from;
  const auth = Buffer.from(keys.sid + ":" + keys.token).toString("base64");
  const res = await fetch("https://api.twilio.com/2010-04-01/Accounts/" + encodeURIComponent(keys.sid) + "/Calls.json", {
    method: "POST",
    headers: {
      Authorization: "Basic " + auth,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ To: to, From: from, Twiml: twimlSay(script) }),
  });
  if (!res.ok) {
    const text = await res.text();
    if (/unverified|trial/i.test(text)) {
      throw new Error("Twilio will not ring that number on a trial account. Verify it in Twilio, or upgrade.");
    }
    if (/authenticate|20003|401/i.test(text)) {
      throw new Error("Twilio rejected those keys. Check the Account SID and Auth Token in Office.");
    }
    throw new Error("The carrier refused the call. Check the from-number is a Twilio number you own.");
  }
  return { mode: "pstn", detail: "Ringing " + to + " from " + from + "." };
}
