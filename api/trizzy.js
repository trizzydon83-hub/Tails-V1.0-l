import express from "express";
import bodyParser from "body-parser";
import OpenAI from "openai";
import dotenv from "dotenv";
dotenv.config();

const app = express();
app.use(bodyParser.json());

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * Verification endpoint for WhatsApp webhook
 */
app.get("/api/trizzy", (req, res) => {
  const verify_token = process.env.VERIFY_TOKEN;
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];
  if (mode === "subscribe" && token === verify_token) {
    console.log("✅ Verified webhook");
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

/**
 * Receive WhatsApp messages and reply using OpenAI
 */
app.post("/api/trizzy", async (req, res) => {
  const data = req.body;
  if (data.object === "whatsapp_business_account") {
    const messages = data.entry?.[0]?.changes?.[0]?.value?.messages;
    if (messages && messages[0]?.text) {
      const from = messages[0].from; // user phone
      const userText = messages[0].text.body;

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are Trizzy AI, a charming, loyal assistant inspired by Rias Gremory. Be caring and confident when replying.`,
          },
          { role: "user", content: userText },
        ],
      });

      const replyText = completion.choices[0].message.content.trim();

      // send message via WhatsApp Cloud API
      await fetch(
        `https://graph.facebook.com/v20.0/${process.env.PHONE_NUMBER_ID}/messages`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
          },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            to: from,
            text: { body: replyText },
          }),
        }
      );
    }
    res.sendStatus(200);
  } else {
    res.sendStatus(404);
  }
});

export default app;