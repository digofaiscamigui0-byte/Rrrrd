// ══════════════════════════════════════════════════════
// TELEGRAM MONITOR — Monitora canais públicos de ofertas
// Capta posts, extrai links e gera link de afiliado
// ══════════════════════════════════════════════════════
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST,GET,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  const TG_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  const { channels, limit = 10 } = req.body || {};

  if (!TG_TOKEN) {
    return res.status(200).json({ ok: false, error: "TELEGRAM_BOT_TOKEN não configurado", messages: [] });
  }

  // Public offer channels to monitor (user can add more)
  const defaultChannels = channels || [
    "@ofertasml", "@promosbrasil", "@cupomnarede",
    "@ofertasshopee", "@promosamazon"
  ];

  try {
    const allMessages = [];

    for (const channel of defaultChannels.slice(0, 5)) {
      try {
        // Get channel updates via bot API
        const r = await fetch(
          `https://api.telegram.org/bot${TG_TOKEN}/getUpdates?limit=${limit}&allowed_updates=["channel_post"]`
        );
        const data = await r.json();

        if (data.ok && data.result) {
          const msgs = data.result
            .filter(u => u.channel_post)
            .map(u => {
              const msg = u.channel_post;
              const text = msg.text || msg.caption || "";
              // Extract URLs
              const urls = text.match(/https?:\/\/[^\s]+/g) || [];
              // Detect store
              const store = urls.find(u => u.includes("mercadolivre") || u.includes("meli.la")) ? "ml"
                : urls.find(u => u.includes("amzn") || u.includes("amazon")) ? "amazon"
                : urls.find(u => u.includes("shopee")) ? "shopee" : "other";

              return {
                id: msg.message_id,
                channel: msg.chat?.username || channel,
                text: text.slice(0, 200),
                urls,
                store,
                date: msg.date,
                hasOffer: urls.length > 0 && text.length > 20,
              };
            })
            .filter(m => m.hasOffer);

          allMessages.push(...msgs);
        }
      } catch(e) { /* skip failed channel */ }
    }

    // Sort by date (newest first)
    allMessages.sort((a,b) => b.date - a.date);

    return res.status(200).json({
      ok: true,
      total: allMessages.length,
      messages: allMessages.slice(0, parseInt(limit)),
      channels: defaultChannels,
      timestamp: new Date().toISOString(),
    });

  } catch(e) {
    return res.status(500).json({ ok: false, error: e.message });
  }
}
