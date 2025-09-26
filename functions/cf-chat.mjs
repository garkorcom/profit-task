import { onRequest } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import OpenAI from "openai";

const OPENAI_API_KEY = defineSecret("OPENAI_API_KEY");

export const chat = onRequest({ secrets: [OPENAI_API_KEY], region: "us-central1" }, async (req, res) => {
  try {
    const client = new OpenAI({ apiKey: OPENAI_API_KEY.value() });
    const { message = "ping" } = (req.body ?? {});
    const r = await client.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [{ role: "user", content: message }],
    });
    res.set("Access-Control-Allow-Origin", "*"); // упростим CORS
    res.json({ reply: r.choices[0].message.content });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: String(e) });
  }
});
