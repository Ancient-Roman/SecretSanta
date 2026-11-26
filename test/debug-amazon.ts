// debug-amazon.ts
import { writeFileSync } from "fs";

async function main() {
  const url = "https://www.amazon.com/dp/B0FY6Y5YDQ";
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 ...", "Accept-Language": "en-US" },
  });
  const html = await res.text();
  writeFileSync("amazon.html", html);

  const probes: Record<string, RegExp> = {
    offscreen: /<span class="a-offscreen">([^<]+)<\/span>/g,
    priceToPay: /priceToPay/g,
    corePrice: /corePrice/g,
    priceAmount: /"priceAmount"\s*:\s*([0-9.]+)/g,
    displayPrice: /"displayPrice"\s*:\s*"([^"]+)"/g,
    dollarSpan: /a-price-whole[^>]*>([^<]+)</g,
  };

  for (const [name, re] of Object.entries(probes)) {
    const hits = [...html.matchAll(re)].map((m) => m[1] ?? m[0]);
    console.log(name, hits.length, hits.slice(0, 5));
  }
}

main().catch(console.error);