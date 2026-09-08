/**
 * CSL Exchange Rate Utility
 * Fetches and caches live exchange rates to IDR with fallback and manual overrides.
 */

export interface ExchangeRateResult {
  rate: number;
  source: 'API' | 'Manual';
  provider?: string;
  error?: string;
  timestamp?: string;
}

// In-memory rate cache (TTL: 1 hour)
const RATE_CACHE: Record<string, { rate: number; timestamp: number; provider: string }> = {};
const CACHE_TTL_MS = 60 * 60 * 1000;

// Fallback rates if network is offline or provider is unavailable
const FALLBACK_RATES: Record<string, number> = {
  IDR: 1,
  SGD: 12450,
  USD: 15800,
  HKD: 2020,
  EUR: 17200,
  GBP: 20400,
  AUD: 10500,
  JPY: 105,
};

/**
 * Fetch latest exchange rate from base currency to IDR.
 */
export async function fetchLiveExchangeRate(
  currency: string,
  ignoreCache = false
): Promise<ExchangeRateResult> {
  const upperCur = (currency || 'IDR').toUpperCase().trim();

  if (upperCur === 'IDR') {
    return { rate: 1, source: 'API', provider: 'Fixed', timestamp: new Date().toISOString() };
  }

  // Check cache first
  const now = Date.now();
  if (!ignoreCache && RATE_CACHE[upperCur] && (now - RATE_CACHE[upperCur].timestamp) < CACHE_TTL_MS) {
    return {
      rate: RATE_CACHE[upperCur].rate,
      source: 'API',
      provider: RATE_CACHE[upperCur].provider,
      timestamp: new Date(RATE_CACHE[upperCur].timestamp).toISOString(),
    };
  }

  // Try Primary API: ExchangeRate.fun
  try {
    const res = await fetch(`https://api.exchangerate.fun/latest?base=${upperCur}`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    });
    if (res.ok) {
      const data = await res.json();
      const idrRate = data?.rates?.IDR || data?.conversion_rates?.IDR;
      if (idrRate && typeof idrRate === 'number' && idrRate > 0) {
        RATE_CACHE[upperCur] = { rate: idrRate, timestamp: now, provider: 'ExchangeRate.fun' };
        return {
          rate: idrRate,
          source: 'API',
          provider: 'ExchangeRate.fun',
          timestamp: new Date().toISOString(),
        };
      }
    }
  } catch (err) {
    console.warn('[ExchangeRate] Primary API failed, trying fallback...', err);
  }

  // Try Secondary API: Open ER API
  try {
    const res = await fetch(`https://open.er-api.com/v6/latest/${upperCur}`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    });
    if (res.ok) {
      const data = await res.json();
      const idrRate = data?.rates?.IDR;
      if (idrRate && typeof idrRate === 'number' && idrRate > 0) {
        RATE_CACHE[upperCur] = { rate: idrRate, timestamp: now, provider: 'open.er-api.com' };
        return {
          rate: idrRate,
          source: 'API',
          provider: 'open.er-api.com',
          timestamp: new Date().toISOString(),
        };
      }
    }
  } catch (err) {
    console.warn('[ExchangeRate] Secondary API failed', err);
  }

  // If APIs failed, use fallback default rate with clear error message
  const fallback = FALLBACK_RATES[upperCur] || 1;
  return {
    rate: fallback,
    source: 'API',
    provider: 'Fallback Default',
    error: 'Unable to retrieve the latest exchange rate from server.',
    timestamp: new Date().toISOString(),
  };
}
