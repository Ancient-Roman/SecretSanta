async function getPrice(url: string) {
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 ...", "Accept-Language": "en-US" },
    redirect: "follow", // handles short links like amzn.to
  });
  const html = await res.text();
  console.log(res.status, html.length, /captcha|robot check/i.test(html));

  // Amazon specific handling
  if (/amazon\./.test(new URL(url).hostname)) {
    const a = amazonPrice(html);
    if (a) return a;
  }

  // 1. Try JSON-LD
  for (const m of html.matchAll(
    /<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g
  )) {
    try {
      const data = JSON.parse(m[1]);
      const nodes = Array.isArray(data) ? data : data["@graph"] ?? [data];
      const product = nodes.find((n: any) => n["@type"] === "Product");
      const offer = [product?.offers].flat()[0];
      if (offer?.price) return { price: offer.price, currency: offer.priceCurrency };
    } catch {}
  }

  // 2. Fall back to meta tags
  const meta = html.match(/property="(?:og|product):price:amount"\s+content="([^"]+)"/);
  if (meta) return { price: meta[1] };

  return null; // let the user enter it manually
}

function amazonPrice(html: string) {
  // 1. Embedded JSON: single hit, unambiguous
  const amount = html.match(/"priceAmount"\s*:\s*([0-9.]+)/);
  if (amount) return { price: parseFloat(amount[1]), currency: "USD" };

  // 2. Fallback: first a-offscreen price inside the priceToPay block
  const block = html.match(/priceToPay[\s\S]{0,1500}?<span class="a-offscreen">\s*([^<\s][^<]*)<\/span>/);
  if (block) {
    const num = parseFloat(block[1].replace(/[^0-9.]/g, ""));
    if (!Number.isNaN(num)) return { price: num, currency: "USD" };
  }

  return null;
}

// test-price.ts
const url = "https://www.amazon.com/dp/B0FY6Y5YDQ"; // trimmed URL, the tracking params aren't needed

getPrice(url).then((r) => console.log("Result:", r));