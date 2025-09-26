import 'dotenv/config';
import OpenAI from "openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const run = async () => {
  const resp = await client.chat.completions.create({
    model: "gpt-4.1-mini",
    messages: [{ role: "user", content: "Проверка подключения из my-business-app" }],
  });
  console.log(resp.choices[0].message.content);
};

run().catch(err => {
  console.error(err?.response?.data ?? err);
  process.exit(1);
});
