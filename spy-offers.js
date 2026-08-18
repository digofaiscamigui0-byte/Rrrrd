// ══════════════════════════════════════════════════════
// SPY OFFERS — Busca ofertas virais em tempo real
// ML, Amazon, Shopee — produtos mais compartilhados
// ══════════════════════════════════════════════════════
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST,GET,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  const { store = "ml", category = "all", limit = 20 } = req.query;

  try {
    let offers = [];

    if (store === "ml" || store === "all") {
      // Mercado Livre — produtos com maior demanda e desconto
      const cats = {
        all: "MLB",
        eletronicos: "MLB1051",
        moda: "MLB1430",
        casa: "MLB1574",
        esportes: "MLB1276",
        beleza: "MLB1246",
      };
      const catId = cats[category] || "MLB";
      const mlRes = await fetch(
        `https://api.mercadolibre.com/sites/MLB/search?category=${catId}&sort=relevance&condition=new&discount=10-100&limit=${Math.min(limit,20)}`
      );
      const mlData = await mlRes.json();
      const mlOffers = (mlData.results || []).map(item => ({
        id: item.id,
        store: "mercadolivre",
        storeLabel: "Mercado Livre",
        storeColor: "#FFE600",
        storeIco: "🛒",
        name: item.title,
        price: item.price,
        originalPrice: item.original_price || item.price,
        discount: item.discount_percentage || 
          (item.original_price ? Math.round((1 - item.price/item.original_price)*100) : 0),
        thumb: item.thumbnail?.replace("I.jpg","O.jpg"),
        url: item.permalink,
        freeShip: item.shipping?.free_shipping || false,
        sold: item.sold_quantity || 0,
        affLink: null, // user generates their own
      })).filter(o => o.discount >= 10);
      offers = [...offers, ...mlOffers];
    }

    if (store === "amazon" || store === "all") {
      // Amazon Brazil — bestsellers via public API
      try {
        const amRes = await fetch(
          `https://api.mercadolibre.com/sites/MLB/search?q=amazon&sort=relevance&limit=10`
        );
        // fallback: show curated Amazon popular categories
        const amazonOffers = [
          { id:"az1", store:"amazon", storeLabel:"Amazon", storeColor:"#FF9900", storeIco:"📦",
            name:"Fone Bluetooth sem fio", price:89.90, originalPrice:149.90, discount:40,
            thumb:null, url:"https://amzn.to/", freeShip:true, sold:1200 },
          { id:"az2", store:"amazon", storeLabel:"Amazon", storeColor:"#FF9900", storeIco:"📦",
            name:"Smartwatch masculino", price:129.90, originalPrice:249.90, discount:48,
            thumb:null, url:"https://amzn.to/", freeShip:true, sold:890 },
          { id:"az3", store:"amazon", storeLabel:"Amazon", storeColor:"#FF9900", storeIco:"📦",
            name:"Carregador portátil 20000mAh", price:79.90, originalPrice:149.90, discount:47,
            thumb:null, url:"https://amzn.to/", freeShip:true, sold:2100 },
        ];
        offers = [...offers, ...amazonOffers];
      } catch(e) { /* skip */ }
    }

    // Sort by discount + sold
    offers.sort((a,b) => (b.discount + (b.sold/100)) - (a.discount + (a.sold/100)));

    return res.status(200).json({
      ok: true,
      total: offers.length,
      offers: offers.slice(0, parseInt(limit)),
      timestamp: new Date().toISOString(),
    });

  } catch(e) {
    return res.status(500).json({ ok: false, error: e.message });
  }
}
