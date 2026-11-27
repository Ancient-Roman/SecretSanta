export type ProductPrice = {
  price: number;
  currency?: string;
};

function parsePrice(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = parseFloat(value.replace(/[^0-9.-]/g, ''));
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function isAmazonUrl(url: URL): boolean {
  const hostname = url.hostname.toLowerCase();
  return (
    hostname === 'a.co' ||
    hostname.endsWith('.a.co') ||
    hostname === 'amzn.to' ||
    hostname.endsWith('.amzn.to') ||
    /(^|\.)amazon\./i.test(hostname)
  );
}

function amazonPrice(html: string): ProductPrice | null {
  const amount = html.match(/"priceAmount"\s*:\s*([0-9.]+)/);
  if (amount) {
    const price = parsePrice(amount[1]);
    if (price !== null) return { price, currency: 'USD' };
  }

  const block = html.match(/priceToPay[\s\S]{0,1500}?<span class="a-offscreen">\s*([^<\s][^<]*)<\/span>/);
  if (block) {
    const price = parsePrice(block[1]);
    if (price !== null) return { price, currency: 'USD' };
  }

  return null;
}

export async function fetchPrice(url: string): Promise<ProductPrice | null> {
  try {
    const parsedUrl = new URL(url);
    const response = await fetch(parsedUrl.toString(), {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/131.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) return null;

    const html = await response.text();

    let finalUrl = parsedUrl;
    if (response.url) {
      try {
        finalUrl = new URL(response.url);
      } catch {
        // Keep the original URL if the response URL is malformed.
      }
    }

    let pageHtml = html;
    if (isAmazonUrl(parsedUrl) || isAmazonUrl(finalUrl)) {
      const asinMatch = finalUrl.pathname.match(/\/(?:dp|gp\/product)\/([A-Z0-9]{10})(?:\/|$)/i);
      if (asinMatch) {
        const canonicalUrl = new URL(`/dp/${asinMatch[1]}`, finalUrl.origin);
        try {
          const canonicalResponse = await fetch(canonicalUrl.toString(), {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/131.0.0.0 Safari/537.36',
              'Accept-Language': 'en-US,en;q=0.9',
            },
            redirect: 'follow',
            signal: AbortSignal.timeout(10_000),
          });
          if (canonicalResponse.ok) pageHtml = await canonicalResponse.text();
        } catch {
          // Fall back to the redirected response HTML.
        }
      }

      const amazonResult = amazonPrice(pageHtml);
      if (amazonResult) return amazonResult;
    }

    for (const match of pageHtml.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
      try {
        const data = JSON.parse(match[1]);
        const nodes = Array.isArray(data) ? data : data['@graph'] ? data['@graph'] : [data];
        const products = nodes.filter((node: { '@type'?: string }) => node['@type'] === 'Product');

        for (const product of products) {
          const offers = Array.isArray(product.offers) ? product.offers : [product.offers];
          for (const offer of offers) {
            const price = parsePrice(offer?.price);
            if (price !== null) {
              return {
                price,
                currency: typeof offer.priceCurrency === 'string' ? offer.priceCurrency : undefined,
              };
            }
          }
        }
      } catch {
        // Ignore malformed JSON-LD blocks.
      }
    }

    const meta = pageHtml.match(/property=["'](?:og|product):price:amount["']\s+content=["']([^"']+)["']/i);
    if (meta) {
      const price = parsePrice(meta[1]);
      if (price !== null) return { price };
    }

    return null;
  } catch {
    return null;
  }
}
