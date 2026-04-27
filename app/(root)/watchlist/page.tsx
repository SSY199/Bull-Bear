import WatchlistAlertsSection from '@/components/WatchlistAlertsSection'
import { getWatchlistForCurrentUser } from '@/lib/actions/watchlist.actions'
import { getBasicFinancials, getNews, getProfile, getQuote, searchStocks } from '@/lib/actions/finnhub.actions'
import { formatChangePercent, formatMarketCapValue, formatPrice } from '@/lib/utils'
import { getAlertsForCurrentUser } from '@/lib/actions/alert.actions'
import SearchCommand from '@/components/SearchCommand'

export const dynamic = 'force-dynamic'

const formatNewsTimestamp = (unixSeconds?: number): string => {
  if (typeof unixSeconds !== 'number' || !Number.isFinite(unixSeconds)) {
    return 'N/A'
  }

  const date = new Date(unixSeconds * 1000)
  if (Number.isNaN(date.getTime())) {
    return 'N/A'
  }

  // Deterministic format avoids server/client locale and timezone hydration mismatches.
  return `${date.toISOString().slice(0, 19).replace('T', ' ')} UTC`
}

const WatchlistPage = async () => {
  const [initialStocks, watchlistItems] = await Promise.all([
    searchStocks(),
    getWatchlistForCurrentUser(),
  ])

  const symbols = watchlistItems.map((w) => w.symbol?.toUpperCase()).filter(Boolean)

  const [news, watchlistWithData, alerts] = await Promise.all([
    getNews(symbols),
    Promise.all(
      watchlistItems.map(async (item) => {
        const symbol = item.symbol.toUpperCase()
        const [quote, profile, financials] = await Promise.all([
          getQuote(symbol),
          getProfile(symbol),
          getBasicFinancials(symbol),
        ])

        const currentPrice = quote?.c
        const changePercent = quote?.dp

        const pe = financials?.metric?.peTTM ?? financials?.metric?.peBasicExclExtraTTM
        const marketCapUsd = profile?.marketCapitalization ? profile.marketCapitalization * 1e6 : undefined

        const enriched: StockWithData = {
          ...item,
          symbol,
          company: item.company || profile?.name || symbol,
          currentPrice,
          changePercent,
          priceFormatted: typeof currentPrice === 'number' ? formatPrice(currentPrice) : '—',
          changeFormatted: typeof changePercent === 'number' ? formatChangePercent(changePercent) : '—',
          marketCap: typeof marketCapUsd === 'number' ? formatMarketCapValue(marketCapUsd) : '—',
          peRatio: typeof pe === 'number' ? pe.toFixed(1) : '—',
        }

        return enriched
      })
    ),
    getAlertsForCurrentUser(),
  ])

  const newsWithStableTime = news.map((article) => ({
    ...article,
    publishedAtLabel: formatNewsTimestamp(article.datetime),
  }))

  if (!watchlistWithData.length) {
    return (
      <div className="watchlist-empty-container">
        <div className="watchlist-empty">
          <div className="watchlist-star">★</div>
          <h2 className="empty-title">Your watchlist is empty</h2>
          <p className="empty-description">
            Search for a stock and add it to your watchlist to track price, change, and news.
          </p>
          <SearchCommand label="Add Stock" initialStocks={initialStocks} />
        </div>
      </div>
    )
  }

  return (
    <WatchlistAlertsSection
      initialStocks={initialStocks}
      watchlistWithData={watchlistWithData}
      news={newsWithStableTime}
      initialAlerts={alerts}
    />
  )
}

export default WatchlistPage

