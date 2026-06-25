const UI = {
  text: {
    trendUp: "Tăng",
    trendDown: "Giảm",
    trendNeutral: "Trung lập",
    chartLoading: "Đang tải biểu đồ Binance...",
    chartFallback: "Không tải được biểu đồ live - đang dùng dữ liệu mẫu",
    alertNote: "Thông báo khi giá chạm mức này",
    deleteAlert: "Xóa cảnh báo",
    deleteHolding: "Xóa holding",
  },
  chart: {
    background: "#081420",
    grid: "rgba(103, 132, 160, 0.22)",
    axis: "#7f95ad",
    up: "#19d27f",
    down: "#ff4d5e",
  },
};

const market = {
  BTC: {
    price: 108240,
    change: 2.84,
    volume: "$54.8B",
    cap: "$2.13T",
    trend: UI.text.trendUp,
  },
  ETH: {
    price: 6210,
    change: 1.16,
    volume: "$24.2B",
    dominance: "18.6%",
    trend: UI.text.trendNeutral,
  },
};

const livePrices = {
  BTC: 108240,
  ETH: 6210,
  SOL: 168,
  BNB: 710,
  XRP: 2.15,
  DOGE: 0.18,
  ADA: 0.64,
  AVAX: 31,
  LINK: 18,
  SUI: 3.1,
};

const portfolio = [
  { coin: "BTC", amount: 0.05, avg: 100000 },
  { coin: "ETH", amount: 1.2, avg: 5800 },
];

const coinGeckoIds = [
  "bitcoin",
  "ethereum",
  "solana",
  "binancecoin",
  "ripple",
  "dogecoin",
  "cardano",
  "avalanche-2",
  "chainlink",
  "sui",
];

const coinSymbols = {
  bitcoin: "BTC",
  ethereum: "ETH",
  solana: "SOL",
  binancecoin: "BNB",
  ripple: "XRP",
  dogecoin: "DOGE",
  cardano: "ADA",
  "avalanche-2": "AVAX",
  chainlink: "LINK",
  sui: "SUI",
};

const binanceSymbols = {
  BTCUSDT: "BTC",
  ETHUSDT: "ETH",
  SOLUSDT: "SOL",
  BNBUSDT: "BNB",
  XRPUSDT: "XRP",
  DOGEUSDT: "DOGE",
  ADAUSDT: "ADA",
  AVAXUSDT: "AVAX",
  LINKUSDT: "LINK",
  SUIUSDT: "SUI",
};

const refreshSeconds = 1;
let refreshTimer = null;
let countdownTimer = null;
let secondsLeft = refreshSeconds;
let lastCoinGeckoExtrasAt = 0;

const walletNetworks = {
  ethereum: {
    label: "Ethereum",
    native: "ETH",
    rpc: "https://ethereum.publicnode.com",
    decimals: 18,
    chainId: "1",
    explorer: "https://etherscan.io/address/",
  },
  bsc: {
    label: "BNB Chain",
    native: "BNB",
    rpc: "https://bsc-dataseed.binance.org",
    decimals: 18,
    chainId: "56",
    explorer: "https://bscscan.com/address/",
  },
  solana: {
    label: "Solana",
    native: "SOL",
    rpc: "https://api.mainnet-beta.solana.com",
    decimals: 9,
    chainId: null,
    explorer: "https://solscan.io/account/",
  },
};

const ranges = {
  "1H": {
    labels: ["09:00", "09:10", "09:20", "09:30", "09:40", "09:50", "10:00"],
    btc: [107820, 108050, 107940, 108260, 108110, 108420, 108240],
    eth: [6150, 6182, 6170, 6204, 6191, 6230, 6210],
  },
  "4H": {
    labels: ["06:00", "07:00", "08:00", "09:00", "10:00", "11:00", "12:00"],
    btc: [106900, 107240, 107680, 107520, 108000, 108360, 108240],
    eth: [6020, 6080, 6118, 6164, 6152, 6220, 6210],
  },
  "1D": {
    labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    btc: [103800, 104950, 106200, 105760, 107450, 108900, 108240],
    eth: [5740, 5860, 6020, 5960, 6120, 6260, 6210],
  },
  "1W": {
    labels: ["W1", "W2", "W3", "W4", "W5", "W6", "W7"],
    btc: [98200, 100600, 101900, 104700, 106800, 109200, 108240],
    eth: [5100, 5320, 5560, 5780, 6010, 6320, 6210],
  },
};

const chartRanges = {
  "1H": { interval: "1m", limit: 60 },
  "4H": { interval: "5m", limit: 48 },
  "1D": { interval: "1h", limit: 24 },
  "1W": { interval: "4h", limit: 42 },
};

const indicators = [
  { name: "RSI", value: 65, label: "Tích cực, chưa quá mua" },
  { name: "MACD", value: 58, label: "Histogram dương" },
  { name: "EMA 20", value: 74, label: "Giá nằm trên EMA" },
  { name: "EMA 50", value: 69, label: "Xu hướng giữ tốt" },
  { name: "EMA 200", value: 82, label: "Trend lớn vẫn tăng" },
];

const coins = [
  { symbol: "BTC", change: 2.0, flow: "Volume lớn" },
  { symbol: "ETH", change: 4.0, flow: "Dòng tiền tăng" },
  { symbol: "SOL", change: 8.0, flow: "Mạnh nhất nhóm L1" },
  { symbol: "BNB", change: 1.8, flow: "Ổn định" },
  { symbol: "XRP", change: 0.7, flow: "Tích lũy" },
  { symbol: "DOGE", change: -3.0, flow: "Áp lực bán" },
  { symbol: "ADA", change: 2.9, flow: "Volume cải thiện" },
  { symbol: "AVAX", change: 5.1, flow: "Breakout ngắn hạn" },
  { symbol: "LINK", change: 3.6, flow: "Theo dõi tiếp" },
  { symbol: "SUI", change: 6.4, flow: "Momentum tốt" },
];

const alerts = [
  { coin: "BTC", rule: ">", price: 120000 },
  { coin: "BTC", rule: "<", price: 100000 },
  { coin: "ETH", rule: ">", price: 7000 },
];

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const compactCurrency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  notation: "compact",
  maximumFractionDigits: 1,
});

const chart = {
  canvas: document.querySelector("#priceChart"),
  range: "1H",
  symbol: "BTCUSDT",
};

Object.keys(ranges).forEach((range) => {
  ranges[range].candles = buildFallbackCandles(ranges[range].btc, ranges[range].labels);
});

function drawChart() {
  const ctx = chart.canvas.getContext("2d");
  const dpr = window.devicePixelRatio || 1;
  const rect = chart.canvas.getBoundingClientRect();
  chart.canvas.width = rect.width * dpr;
  chart.canvas.height = rect.height * dpr;
  ctx.scale(dpr, dpr);

  const width = rect.width;
  const height = rect.height;
  const pad = { top: 20, right: 76, bottom: 34, left: 18 };
  const data = ranges[chart.range];
  const candles = data?.candles;
  if (!candles?.length) return;
  const lows = candles.map((item) => item.low);
  const highs = candles.map((item) => item.high);
  const min = Math.min(...lows) * 0.999;
  const max = Math.max(...highs) * 1.001;

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = UI.chart.background;
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = UI.chart.grid;
  ctx.lineWidth = 1;
  ctx.fillStyle = UI.chart.axis;
  ctx.font = "12px Inter, sans-serif";

  for (let i = 0; i < 5; i += 1) {
    const y = pad.top + ((height - pad.top - pad.bottom) / 4) * i;
    const value = max - ((max - min) / 4) * i;
    ctx.beginPath();
    ctx.moveTo(pad.left, y);
    ctx.lineTo(width - pad.right, y);
    ctx.stroke();
    ctx.fillText(formatAxisPrice(value), width - pad.right + 10, y + 4);
  }

  candles.forEach((candle, index) => {
    if (index % Math.ceil(candles.length / 8) !== 0) return;
    const x = xFor(index, candles.length, width, pad);
    ctx.fillText(candle.label, x - 18, height - 10);
  });

  drawCandles(ctx, candles, min, max, width, height, pad);
}

async function loadChartData(range = chart.range) {
  const settings = chartRanges[range];
  if (!settings) return;

  setChartStatus(UI.text.chartLoading);

  try {
    const candles = await fetchBinanceKlines(chart.symbol, settings, range);

    ranges[range] = {
      candles,
    };

    drawChart();
    setChartStatus(`Biểu đồ nến live ${chart.symbol.replace("USDT", "")} ${range}`);
  } catch (error) {
    console.warn(error);
    drawChart();
    setChartStatus(UI.text.chartFallback);
  }
}

async function fetchBinanceKlines(symbol, settings, range) {
  const url = new URL("https://api.binance.com/api/v3/klines");
  url.search = new URLSearchParams({
    symbol,
    interval: settings.interval,
    limit: String(settings.limit),
  }).toString();

  const response = await fetch(url);
  if (!response.ok) throw new Error(`Binance klines ${symbol} HTTP ${response.status}`);
  const data = await response.json();

  return data.map((row) => ({
    openTime: row[0],
    label: formatChartLabel(row[0], range),
    open: Number(row[1]),
    high: Number(row[2]),
    low: Number(row[3]),
    close: Number(row[4]),
  }));
}

function formatChartLabel(timestamp, range) {
  const date = new Date(timestamp);
  if (range === "1W") {
    return date.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
  }
  if (range === "1D") {
    return date.toLocaleTimeString("vi-VN", { hour: "2-digit" });
  }
  return date.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
}

function setChartStatus(text) {
  document.querySelector("#chartStatus").textContent = text;
}

function xFor(index, count, width, pad) {
  return pad.left + ((width - pad.left - pad.right) / (count - 1)) * index;
}

function yFor(value, min, max, height, pad) {
  return pad.top + (1 - (value - min) / (max - min)) * (height - pad.top - pad.bottom);
}

function drawCandles(ctx, candles, min, max, width, height, pad) {
  const chartWidth = width - pad.left - pad.right;
  const step = chartWidth / candles.length;
  const bodyWidth = Math.max(3, Math.min(14, step * 0.62));

  candles.forEach((candle, index) => {
    const x = pad.left + step * index + step / 2;
    const openY = yFor(candle.open, min, max, height, pad);
    const closeY = yFor(candle.close, min, max, height, pad);
    const highY = yFor(candle.high, min, max, height, pad);
    const lowY = yFor(candle.low, min, max, height, pad);
    const up = candle.close >= candle.open;
    const color = up ? UI.chart.up : UI.chart.down;
    const top = Math.min(openY, closeY);
    const bodyHeight = Math.max(2, Math.abs(closeY - openY));

    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x, highY);
    ctx.lineTo(x, lowY);
    ctx.stroke();
    ctx.fillRect(x - bodyWidth / 2, top, bodyWidth, bodyHeight);
  });
}

function formatAxisPrice(value) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: value >= 100 ? 0 : 2,
  }).format(value);
}

function buildFallbackCandles(values, labels) {
  return values.map((close, index) => {
    const prev = values[index - 1] ?? close * 0.999;
    const open = prev;
    const spread = Math.max(close * 0.0012, Math.abs(close - open) * 1.4);
    return {
      openTime: Date.now(),
      label: labels[index] || "",
      open,
      high: Math.max(open, close) + spread,
      low: Math.min(open, close) - spread,
      close,
    };
  });
}

function renderIndicators() {
  const list = document.querySelector("#indicatorList");
  list.innerHTML = indicators
    .map(
      (item) => `
        <div class="indicator">
          <span>${item.name}</span>
          <div class="bar" aria-hidden="true"><i style="width:${item.value}%"></i></div>
          <strong>${item.value} - ${item.label}</strong>
        </div>
      `,
    )
    .join("");
}

function renderCoins() {
  const grid = document.querySelector("#coinGrid");
  grid.innerHTML = coins
    .map((coin) => {
      const direction = coin.change >= 0 ? "gain" : "loss";
      const sign = coin.change >= 0 ? "+" : "";
      return `
        <article class="coin-card ${direction}">
          <span>${coin.symbol}</span>
          <strong>${sign}${coin.change}%</strong>
          <span>${coin.flow}</span>
        </article>
      `;
    })
    .join("");
}

async function loadLiveMarket() {
  setApiStatus("Loading Binance...");

  try {
    const binanceUrl = new URL("https://api.binance.com/api/v3/ticker/24hr");
    binanceUrl.search = new URLSearchParams({
      symbols: JSON.stringify(Object.keys(binanceSymbols)),
    }).toString();

    const binanceResponse = await fetch(binanceUrl);

    if (!binanceResponse.ok) {
      throw new Error(`Binance ticker HTTP ${binanceResponse.status}`);
    }

    const binanceData = await binanceResponse.json();
    applyBinanceData(binanceData);

    updateMarketDom();
    updateAiCopy();
    updateCoinHeatmapFromBinance(binanceData);
    loadCoinGeckoExtrasThrottled();

    const updatedAt = new Date().toLocaleTimeString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
    });
    setApiStatus(`Live Binance ${updatedAt}`);
    resetCountdown();
  } catch (error) {
    console.warn(error);
    setApiStatus(`Binance error - ${error.message}`);
    updateMarketDom();
    renderCoins();
    resetCountdown();
  }
}

function applyCoinGeckoData(symbol, data) {
  if (!data) return;
  market[symbol].volume = compactCurrency.format(data.total_volume || 0);

  if (symbol === "BTC") {
    market.BTC.cap = compactCurrency.format(data.market_cap || 0);
    market.BTC.trend =
      market.BTC.change > 1 ? UI.text.trendUp : market.BTC.change < -1 ? UI.text.trendDown : UI.text.trendNeutral;
  }

  if (symbol === "ETH") {
    market.ETH.trend =
      market.ETH.change > 1 ? UI.text.trendUp : market.ETH.change < -1 ? UI.text.trendDown : UI.text.trendNeutral;
  }
}

function applyBinanceData(rows) {
  rows.forEach((row) => {
    const symbol = binanceSymbols[row.symbol];
    if (!symbol) return;

    livePrices[symbol] = Number(row.lastPrice);

    if (!market[symbol]) return;
    market[symbol].price = Number(row.lastPrice);
    market[symbol].change = Number(Number(row.priceChangePercent).toFixed(2));
    market[symbol].volume = compactCurrency.format(Number(row.quoteVolume || 0));
    market[symbol].trend =
      market[symbol].change > 1
        ? UI.text.trendUp
        : market[symbol].change < -1
          ? UI.text.trendDown
          : UI.text.trendNeutral;
  });
}

async function loadCoinGeckoExtras() {
  try {
    const ids = coinGeckoIds.join(",");
    const marketsUrl = new URL("https://api.coingecko.com/api/v3/coins/markets");
    marketsUrl.search = new URLSearchParams({
      vs_currency: "usd",
      ids,
      order: "market_cap_desc",
      per_page: "10",
      page: "1",
      sparkline: "false",
      price_change_percentage: "24h",
    }).toString();

    const globalUrl = "https://api.coingecko.com/api/v3/global";
    const [marketsResponse, globalResponse] = await Promise.all([
      fetch(marketsUrl),
      fetch(globalUrl),
    ]);

    if (marketsResponse.ok) {
      const marketsData = await marketsResponse.json();
      const byId = Object.fromEntries(marketsData.map((coin) => [coin.id, coin]));
      applyCoinGeckoData("BTC", byId.bitcoin);
      applyCoinGeckoData("ETH", byId.ethereum);
    }

    if (globalResponse.ok) {
      const globalData = await globalResponse.json();
      if (globalData?.data?.market_cap_percentage?.eth) {
        market.ETH.dominance = `${globalData.data.market_cap_percentage.eth.toFixed(1)}%`;
      }
    }

    updateMarketDom();
  } catch (error) {
    console.warn("CoinGecko extra data skipped:", error);
  }
}

function loadCoinGeckoExtrasThrottled() {
  const now = Date.now();
  if (now - lastCoinGeckoExtrasAt < 5 * 60 * 1000) return;
  lastCoinGeckoExtrasAt = now;
  loadCoinGeckoExtras();
}

function updateCoinHeatmap(marketsData) {
  coins.length = 0;
  marketsData.forEach((coin) => {
    const change = Number((coin.price_change_percentage_24h || 0).toFixed(2));
    coins.push({
      symbol: coinSymbols[coin.id] || coin.symbol.toUpperCase(),
      change,
      flow: coin.total_volume ? `Vol ${compactCurrency.format(coin.total_volume)}` : "No volume data",
    });
  });
  renderCoins();
}

function updateCoinHeatmapFromBinance(rows) {
  coins.length = 0;
  rows.forEach((row) => {
    const symbol = binanceSymbols[row.symbol];
    if (!symbol) return;
    const change = Number(Number(row.priceChangePercent).toFixed(2));
    coins.push({
      symbol,
      change,
      flow: `Vol ${compactCurrency.format(Number(row.quoteVolume || 0))}`,
    });
  });
  renderCoins();
}

function setApiStatus(text) {
  document.querySelector("#apiStatus").textContent = text;
}

function startAutoRefresh() {
  if (refreshTimer) clearInterval(refreshTimer);
  if (countdownTimer) clearInterval(countdownTimer);

  refreshTimer = setInterval(loadLiveMarket, refreshSeconds * 1000);
  countdownTimer = setInterval(() => {
    secondsLeft = Math.max(0, secondsLeft - 1);
    document.querySelector("#autoStatus").textContent = `Auto ${secondsLeft}s`;
  }, 1000);
  resetCountdown();
}

function resetCountdown() {
  secondsLeft = refreshSeconds;
  document.querySelector("#autoStatus").textContent = `Auto ${refreshSeconds}s`;
}

function renderAlerts() {
  const list = document.querySelector("#alertsList");
  list.innerHTML = alerts
    .map(
      (alert, index) => `
        <div class="alert-item">
          <div>
            <strong>${alert.coin} ${alert.rule} ${currency.format(alert.price)}</strong>
            <span>${UI.text.alertNote}</span>
          </div>
          <button type="button" data-alert="${index}" aria-label="${UI.text.deleteAlert}">×</button>
        </div>
      `,
    )
    .join("");
}

function randomizeMarket() {
  loadLiveMarket();
}

function updateMarketDom() {
  document.querySelector("#btcPrice").textContent = currency.format(market.BTC.price);
  document.querySelector("#ethPrice").textContent = currency.format(market.ETH.price);
  document.querySelector("#btcChange").textContent = `${market.BTC.change > 0 ? "+" : ""}${market.BTC.change}%`;
  document.querySelector("#ethChange").textContent = `${market.ETH.change > 0 ? "+" : ""}${market.ETH.change}%`;
  document.querySelector("#btcChange").className = market.BTC.change >= 0 ? "positive" : "negative";
  document.querySelector("#ethChange").className = market.ETH.change >= 0 ? "positive" : "negative";
  document.querySelector("#btcVolume").textContent = market.BTC.volume;
  document.querySelector("#ethVolume").textContent = market.ETH.volume;
  document.querySelector("#btcCap").textContent = market.BTC.cap;
  document.querySelector("#ethDominance").textContent = market.ETH.dominance;
  updateTrendBadge("#btcTrend", market.BTC.trend);
  updateTrendBadge("#ethTrend", market.ETH.trend);
  renderPortfolio();
}

function updateTrendBadge(selector, trend) {
  const badge = document.querySelector(selector);
  badge.textContent = trend;
  badge.className = trend === UI.text.trendUp ? "trend-badge up" : "trend-badge neutral";
}

function updateAiCopy() {
  const btcTone = market.BTC.change >= 0 ? "tich cuc" : "dang chiu ap luc";
  const ethTone = market.ETH.change >= 0 ? "hoi phuc" : "yeu hon BTC";
  document.querySelector("#aiCopy").innerHTML = `
    <p>
      BTC dang ${btcTone} trong 24h voi bien dong ${market.BTC.change > 0 ? "+" : ""}${market.BTC.change}%.
      Gia hien tai la ${currency.format(market.BTC.price)}, volume 24h ${market.BTC.volume}.
    </p>
    <p>
      ETH dang ${ethTone} voi bien dong ${market.ETH.change > 0 ? "+" : ""}${market.ETH.change}%.
      Dominance ETH hien khoang ${market.ETH.dominance}. Can ket hop them RSI, EMA va vung ho tro/khang cu truoc khi ra quyet dinh.
    </p>
  `;
}

document.querySelectorAll("[data-range]").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll("[data-range]").forEach((item) => item.classList.remove("active"));
    button.classList.add("active");
    chart.range = button.dataset.range;
    loadChartData(chart.range);
  });
});

document.querySelectorAll("[data-chart-coin]").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll("[data-chart-coin]").forEach((item) => item.classList.remove("active"));
    button.classList.add("active");
    chart.symbol = button.dataset.chartCoin;
    loadChartData(chart.range);
  });
});

document.querySelector("#refreshBtn").addEventListener("click", randomizeMarket);

document.querySelector("#alertForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const coin = document.querySelector("#alertCoin").value;
  const rule = document.querySelector("#alertRule").value;
  const price = Number(document.querySelector("#alertPrice").value);
  if (!price) return;
  alerts.unshift({ coin, rule, price });
  event.currentTarget.reset();
  renderAlerts();
});

document.querySelector("#alertsList").addEventListener("click", (event) => {
  const button = event.target.closest("button[data-alert]");
  if (!button) return;
  alerts.splice(Number(button.dataset.alert), 1);
  renderAlerts();
});

document.querySelector("#portfolioForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const coin = document.querySelector("#holdingCoin").value;
  const amount = Number(document.querySelector("#holdingAmount").value);
  const avg = Number(document.querySelector("#holdingAvg").value);
  if (!amount || !avg) return;

  const existing = portfolio.find((item) => item.coin === coin);
  if (existing) {
    const totalCost = existing.amount * existing.avg + amount * avg;
    existing.amount += amount;
    existing.avg = totalCost / existing.amount;
  } else {
    portfolio.push({ coin, amount, avg });
  }

  event.currentTarget.reset();
  renderPortfolio();
});

document.querySelector("#portfolioRows").addEventListener("click", (event) => {
  const button = event.target.closest("button[data-holding]");
  if (!button) return;
  portfolio.splice(Number(button.dataset.holding), 1);
  renderPortfolio();
});

document.querySelector("#walletForm").addEventListener("submit", (event) => {
  event.preventDefault();
  scanWallet();
});

window.addEventListener("resize", drawChart);

const appViews = {
  dashboard: {
    title: "Real-time crypto sentiment analysis",
    sections: ["dashboard", "market-analysis", "signal-workbench"],
  },
  technical: {
    title: "Technical indicator workspace",
    sections: ["market-analysis"],
  },
  ai: {
    title: "AI market thesis",
    sections: ["signal-workbench"],
  },
  alerts: {
    title: "Price alert triggers",
    sections: ["signal-workbench"],
  },
  "whale-alert": {
    title: "Whale Alert monitor",
    sections: ["whale-alert"],
  },
  portfolio: {
    title: "Portfolio tracker",
    sections: ["portfolio"],
  },
  "wallet-analysis": {
    title: "Wallet scanner",
    sections: ["wallet-analysis"],
  },
  market: {
    title: "Top coin heatmap",
    sections: ["market"],
  },
};

function setAppView(viewName) {
  const view = appViews[viewName] || appViews.dashboard;
  const visibleSections = new Set(view.sections);

  document.querySelectorAll(".app-view").forEach((section) => {
    section.hidden = !visibleSections.has(section.id);
  });

  document.querySelectorAll(".nav-item[data-view]").forEach((item) => {
    item.classList.toggle("active", item.dataset.view === viewName);
  });

  const title = document.querySelector("#viewTitle");
  if (title) title.textContent = view.title;

  if (view.sections.includes("market-analysis")) {
    requestAnimationFrame(drawChart);
  }
}

function bindAppNavigation() {
  document.querySelectorAll(".nav-item[data-view]").forEach((item) => {
    item.addEventListener("click", (event) => {
      event.preventDefault();
      const viewName = item.dataset.view || "dashboard";
      history.replaceState(null, "", `#${viewName}`);
      setAppView(viewName);
      window.scrollTo({ top: 0, behavior: "instant" });
    });
  });

  const initialView = window.location.hash.replace("#", "") || "dashboard";
  setAppView(appViews[initialView] ? initialView : "dashboard");
}

updateMarketDom();
renderIndicators();
renderCoins();
renderAlerts();
renderPortfolio();
restoreEtherscanApiKey();
bindAppNavigation();
drawChart();
loadChartData();
loadLiveMarket();
startAutoRefresh();

function renderPortfolio() {
  const rows = document.querySelector("#portfolioRows");
  let totalValue = 0;

  rows.innerHTML = portfolio
    .map((holding, index) => {
      const price = livePrices[holding.coin] || 0;
      const value = holding.amount * price;
      const cost = holding.amount * holding.avg;
      const pnl = value - cost;
      const pnlPercent = cost ? (pnl / cost) * 100 : 0;
      totalValue += value;

      return `
        <tr>
          <td><strong>${holding.coin}</strong></td>
          <td>${formatAmount(holding.amount)}</td>
          <td>${formatPrice(price)}</td>
          <td>${currency.format(value)}</td>
          <td class="${pnl >= 0 ? "positive" : "negative"}">
            ${pnl >= 0 ? "+" : ""}${currency.format(pnl)} (${pnlPercent >= 0 ? "+" : ""}${pnlPercent.toFixed(2)}%)
          </td>
          <td><button type="button" data-holding="${index}" aria-label="${UI.text.deleteHolding}">×</button></td>
        </tr>
      `;
    })
    .join("");

  document.querySelector("#portfolioValue").textContent = currency.format(totalValue);
}

function formatAmount(value) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 8,
  }).format(value);
}

function formatPrice(value) {
  if (value >= 1) return currency.format(value);
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 6,
  }).format(value);
}

async function scanWallet() {
  const networkKey = document.querySelector("#walletNetwork").value;
  const rawAddress = document.querySelector("#walletAddress").value.trim();
  const address = extractWalletAddress(rawAddress);
  const etherscanApiKey = document.querySelector("#etherscanApiKey").value.trim();
  const network = walletNetworks[networkKey];

  clearWalletRows();
  setWalletStatus("Đang quét...");

  try {
    validateWalletAddress(networkKey, address);
    updateExplorerLink(network, address);
    rememberEtherscanApiKey(etherscanApiKey);

    const nativeBalance =
      networkKey === "solana"
        ? await fetchSolanaBalance(network.rpc, address)
        : await fetchEvmBalance(network.rpc, address, network.decimals);

    const assets = [
      buildWalletAsset({
        symbol: network.native,
        amount: nativeBalance,
        source: `${network.label} RPC`,
      }),
    ];

    if (network.chainId && etherscanApiKey) {
      const tokens = await fetchEtherscanTokenHoldings(address, network.chainId, etherscanApiKey);
      assets.push(...tokens);
    } else if (networkKey === "ethereum") {
      const tokens = await fetchEthereumTokens(address);
      assets.push(...tokens);
    }

    renderWalletAssets(assets);
    setWalletStatus(`Đã quét ${network.label}`);
  } catch (error) {
    console.warn(error);
    setWalletStatus(error.message);
  }
}

function extractWalletAddress(input) {
  const evmMatch = input.match(/0x[a-fA-F0-9]{40}/);
  if (evmMatch) return evmMatch[0];

  const solanaMatch = input.match(/[1-9A-HJ-NP-Za-km-z]{32,44}/);
  return solanaMatch ? solanaMatch[0] : input;
}

function validateWalletAddress(networkKey, address) {
  if (!address) throw new Error("Chưa nhập địa chỉ ví");

  if (networkKey === "solana") {
    if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address)) {
      throw new Error("Địa chỉ Solana không hợp lệ");
    }
    return;
  }

  if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
    throw new Error("Địa chỉ EVM không hợp lệ");
  }
}

async function fetchEvmBalance(rpc, address, decimals) {
  const response = await fetch(rpc, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "eth_getBalance",
      params: [address, "latest"],
    }),
  });

  if (!response.ok) throw new Error(`RPC lỗi ${response.status}`);
  const data = await response.json();
  if (data.error) throw new Error(data.error.message || "RPC trả lỗi");

  return Number(formatUnits(BigInt(data.result), decimals));
}

async function fetchSolanaBalance(rpc, address) {
  const response = await fetch(rpc, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "getBalance",
      params: [address],
    }),
  });

  if (!response.ok) throw new Error(`Solana RPC lỗi ${response.status}`);
  const data = await response.json();
  if (data.error) throw new Error(data.error.message || "Solana RPC trả lỗi");

  return Number(formatUnits(BigInt(data.result.value || 0), 9));
}

async function fetchEthereumTokens(address) {
  try {
    const response = await fetch(`https://api.ethplorer.io/getAddressInfo/${address}?apiKey=freekey`);
    if (!response.ok) throw new Error(`Ethplorer ${response.status}`);
    const data = await response.json();
    if (!Array.isArray(data.tokens)) return [];

    return data.tokens
      .filter((item) => item.tokenInfo?.symbol && Number(item.balance) > 0)
      .slice(0, 20)
      .map((item) => {
        const decimals = Number(item.tokenInfo.decimals || 0);
        const amount = Number(item.balance) / 10 ** decimals;
        const symbol = item.tokenInfo.symbol.toUpperCase();
        const price = Number(item.tokenInfo.price?.rate || livePrices[symbol] || 0);
        return buildWalletAsset({
          symbol,
          amount,
          price,
          source: "Ethplorer",
        });
      });
  } catch (error) {
    document.querySelector("#walletHelp").textContent =
      "Không lấy được ERC-20 token từ public indexer. Native balance vẫn được cập nhật; token đầy đủ cần API key/indexer riêng.";
    console.warn(error);
    return [];
  }
}

async function fetchEtherscanTokenHoldings(address, chainId, apiKey) {
  const url = new URL("https://api.etherscan.io/v2/api");
  url.search = new URLSearchParams({
    chainid: chainId,
    module: "account",
    action: "addresstokenbalance",
    address,
    page: "1",
    offset: "100",
    apikey: apiKey,
  }).toString();

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Etherscan HTTP ${response.status}`);
    const data = await response.json();

    if (data.status !== "1" || !Array.isArray(data.result)) {
      throw new Error(data.message || "Etherscan không trả token holdings");
    }

    document.querySelector("#walletHelp").textContent =
      "Token holdings đang lấy từ Etherscan API V2 addresstokenbalance.";

    return data.result
      .filter((token) => Number(token.TokenQuantity) > 0)
      .slice(0, 100)
      .map((token) => {
        const decimals = Number(token.TokenDivisor || 0);
        const amount = Number(formatUnits(BigInt(token.TokenQuantity), decimals));
        const symbol = String(token.TokenSymbol || "TOKEN").toUpperCase();
        const price = Number(token.TokenPriceUSD || livePrices[symbol] || 0);
        return buildWalletAsset({
          symbol,
          amount,
          price,
          source: "Etherscan API",
        });
      });
  } catch (error) {
    document.querySelector("#walletHelp").textContent =
      "Endpoint portfolio của Etherscan không khả dụng. Đang thử quét ERC-20 transfers để lấy balance hiện tại.";
    console.warn(error);
    return fetchEtherscanTokensFromTransfers(address, chainId, apiKey);
  }
}

async function fetchEtherscanTokensFromTransfers(address, chainId, apiKey) {
  try {
    const transferUrl = new URL("https://api.etherscan.io/v2/api");
    transferUrl.search = new URLSearchParams({
      chainid: chainId,
      module: "account",
      action: "tokentx",
      address,
      page: "1",
      offset: "1000",
      sort: "desc",
      apikey: apiKey,
    }).toString();

    const response = await fetch(transferUrl);
    if (!response.ok) throw new Error(`Etherscan transfer HTTP ${response.status}`);
    const data = await response.json();
    if (!Array.isArray(data.result)) throw new Error(data.message || "Không lấy được ERC-20 transfers");

    const contracts = dedupeTokenContracts(data.result).slice(0, 25);
    const balances = [];

    for (const token of contracts) {
      const balance = await fetchEtherscanTokenBalance({
        address,
        chainId,
        apiKey,
        contractAddress: token.contractAddress,
      });

      if (balance <= 0) continue;

      const amount = Number(formatUnits(BigInt(balance), token.decimals));
      const symbol = token.symbol.toUpperCase();
      balances.push(
        buildWalletAsset({
          symbol,
          amount,
          price: livePrices[symbol] || 0,
          source: "Etherscan transfers",
        }),
      );
    }

    document.querySelector("#walletHelp").textContent =
      "Token được suy ra từ 1.000 ERC-20 transfers gần nhất trên Etherscan rồi kiểm tra balance hiện tại từng contract.";
    return balances;
  } catch (error) {
    document.querySelector("#walletHelp").textContent =
      "Không lấy được token từ Etherscan. Kiểm tra API key hoặc dùng backend/indexer chuyên dụng để đọc portfolio đầy đủ.";
    console.warn(error);
    return [];
  }
}

function dedupeTokenContracts(transfers) {
  const seen = new Map();

  transfers.forEach((transfer) => {
    const contractAddress = String(transfer.contractAddress || "").toLowerCase();
    if (!/^0x[a-f0-9]{40}$/.test(contractAddress) || seen.has(contractAddress)) return;

    seen.set(contractAddress, {
      contractAddress,
      symbol: transfer.tokenSymbol || "TOKEN",
      decimals: Number(transfer.tokenDecimal || 0),
    });
  });

  return Array.from(seen.values());
}

async function fetchEtherscanTokenBalance({ address, chainId, apiKey, contractAddress }) {
  const url = new URL("https://api.etherscan.io/v2/api");
  url.search = new URLSearchParams({
    chainid: chainId,
    module: "account",
    action: "tokenbalance",
    contractaddress: contractAddress,
    address,
    tag: "latest",
    apikey: apiKey,
  }).toString();

  const response = await fetch(url);
  if (!response.ok) return "0";
  const data = await response.json();
  return data.status === "1" ? data.result : "0";
}

function buildWalletAsset({ symbol, amount, price, source }) {
  const currentPrice = price ?? livePrices[symbol] ?? 0;
  return {
    symbol,
    amount,
    price: currentPrice,
    value: amount * currentPrice,
    source,
  };
}

function renderWalletAssets(assets) {
  const rows = document.querySelector("#walletAssetRows");
  const totalValue = assets.reduce((sum, asset) => sum + asset.value, 0);

  rows.innerHTML = assets
    .map(
      (asset) => `
        <tr>
          <td><strong>${asset.symbol}</strong></td>
          <td>${formatAmount(asset.amount)}</td>
          <td>${asset.price ? formatPrice(asset.price) : "-"}</td>
          <td>${asset.price ? currency.format(asset.value) : "-"}</td>
          <td>${asset.source}</td>
        </tr>
      `,
    )
    .join("");

  document.querySelector("#walletNativeBalance").textContent = assets[0]
    ? `${formatAmount(assets[0].amount)} ${assets[0].symbol}`
    : "-";
  document.querySelector("#walletUsdValue").textContent = currency.format(totalValue);
  document.querySelector("#walletTokenCount").textContent = String(Math.max(0, assets.length - 1));
}

function clearWalletRows() {
  document.querySelector("#walletAssetRows").innerHTML = "";
  document.querySelector("#walletNativeBalance").textContent = "-";
  document.querySelector("#walletUsdValue").textContent = "-";
  document.querySelector("#walletTokenCount").textContent = "-";
  document.querySelector("#walletHelp").textContent =
    "Dán link Etherscan dạng https://etherscan.io/address/0x... hoặc địa chỉ ví trực tiếp.";
}

function setWalletStatus(text) {
  document.querySelector("#walletStatus").textContent = text;
}

function updateExplorerLink(network, address) {
  const link = document.querySelector("#walletExplorerLink");
  link.href = `${network.explorer}${address}`;
  link.textContent = `Mở ${network.label} explorer`;
}

function rememberEtherscanApiKey(apiKey) {
  if (!apiKey) return;
  localStorage.setItem("etherscanApiKey", apiKey);
}

function restoreEtherscanApiKey() {
  const savedKey = localStorage.getItem("etherscanApiKey");
  if (savedKey) document.querySelector("#etherscanApiKey").value = savedKey;
}

function formatUnits(rawValue, decimals) {
  const base = 10n ** BigInt(decimals);
  const whole = rawValue / base;
  const fraction = rawValue % base;
  const fractionText = fraction.toString().padStart(decimals, "0").replace(/0+$/, "");
  return fractionText ? `${whole}.${fractionText}` : whole.toString();
}

const whaleApiBase = "http://127.0.0.1:8000";
const whaleWsUrl = "ws://127.0.0.1:8000/ws/alerts";
let whaleSocket = null;

async function whaleRequest(path, options = {}) {
  const response = await fetch(`${whaleApiBase}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `HTTP ${response.status}`);
  }

  if (response.status === 204) return null;
  return response.json();
}

function setWhaleStatus(text, isError = false) {
  const status = document.querySelector("#whaleStatus");
  if (!status) return;
  status.textContent = text;
  status.style.color = isError ? "var(--red)" : "";
}

function formatWhaleUsd(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

async function loadWhaleModule() {
  if (!document.querySelector("#whale-alert")) return;

  try {
    const [wallets, alertsData, threshold] = await Promise.all([
      whaleRequest("/wallets"),
      whaleRequest("/alerts"),
      whaleRequest("/settings/threshold"),
    ]);

    renderWhaleWallets(wallets);
    renderWhaleAlerts(alertsData);
    document.querySelector("#whaleThreshold").value = threshold.threshold_usd;
    document.querySelector("#whaleWalletCount").textContent = String(wallets.length);
    document.querySelector("#whaleAlertCount").textContent = String(alertsData.length);
    document.querySelector("#whaleThresholdValue").textContent = formatWhaleUsd(threshold.threshold_usd);
    setWhaleStatus("Backend live");
  } catch (error) {
    console.warn(error);
    renderWhaleWallets([]);
    renderWhaleAlerts([]);
    document.querySelector("#whaleWalletCount").textContent = "0";
    document.querySelector("#whaleAlertCount").textContent = "0";
    setWhaleStatus("Chưa kết nối DB/API", true);
  }
}

function renderWhaleWallets(wallets) {
  const list = document.querySelector("#whaleWalletList");
  if (!list) return;

  if (!wallets.length) {
    list.innerHTML = `<div class="whale-empty">Chưa có ví cá voi nào hoặc backend database chưa sẵn sàng.</div>`;
    return;
  }

  list.innerHTML = wallets
    .map(
      (wallet) => `
        <article class="whale-item">
          <div class="whale-item-head">
            <strong>${wallet.label}</strong>
            <span class="trend-badge ${wallet.is_active ? "up" : "neutral"}">${wallet.is_active ? "Đang theo dõi" : "Tạm tắt"}</span>
          </div>
          <span class="whale-address">${wallet.chain} · ${wallet.address}</span>
          <div class="whale-actions">
            <button type="button" data-whale-toggle="${wallet.id}" data-active="${wallet.is_active}">${wallet.is_active ? "Tắt" : "Bật"}</button>
            <button type="button" data-whale-edit="${wallet.id}" data-label="${wallet.label}">Sửa nhãn</button>
            <button class="danger" type="button" data-whale-delete="${wallet.id}">Xóa</button>
          </div>
        </article>
      `,
    )
    .join("");
}

function renderWhaleAlerts(alertsData) {
  const list = document.querySelector("#whaleAlertList");
  if (!list) return;

  if (!alertsData.length) {
    list.innerHTML = `<div class="whale-empty">Chưa có alert. Gửi fake webhook để test realtime.</div>`;
    return;
  }

  list.innerHTML = alertsData
    .slice(0, 20)
    .map(
      (alert) => `
        <article class="whale-alert">
          <div class="whale-alert-head">
            <strong>${alert.title}</strong>
            <span class="positive">${formatWhaleUsd(alert.usd_value)}</span>
          </div>
          <p>${String(alert.message).replace(/\n/g, "<br>")}</p>
        </article>
      `,
    )
    .join("");
}

function prependWhaleAlert(alert) {
  const list = document.querySelector("#whaleAlertList");
  if (!list) return;

  const current = list.querySelectorAll(".whale-alert");
  if (!current.length) list.innerHTML = "";

  list.insertAdjacentHTML(
    "afterbegin",
    `
      <article class="whale-alert">
        <div class="whale-alert-head">
          <strong>${alert.title}</strong>
          <span class="positive">${formatWhaleUsd(alert.usd_value)}</span>
        </div>
        <p>${String(alert.message).replace(/\n/g, "<br>")}</p>
      </article>
    `,
  );
}

function connectWhaleSocket() {
  if (!document.querySelector("#whale-alert") || whaleSocket) return;

  whaleSocket = new WebSocket(whaleWsUrl);
  whaleSocket.addEventListener("open", () => setWhaleStatus("Realtime live"));
  whaleSocket.addEventListener("close", () => {
    whaleSocket = null;
    setWhaleStatus("Realtime offline", true);
  });
  whaleSocket.addEventListener("error", () => setWhaleStatus("WebSocket lỗi", true));
  whaleSocket.addEventListener("message", (event) => {
    const payload = JSON.parse(event.data);
    if (payload.type === "alert") prependWhaleAlert(payload.data);
  });
}

function bindWhaleForms() {
  const walletForm = document.querySelector("#whaleWalletForm");
  const thresholdForm = document.querySelector("#whaleThresholdForm");
  const walletList = document.querySelector("#whaleWalletList");

  if (walletForm) {
    walletForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      try {
        await whaleRequest("/wallets", {
          method: "POST",
          body: JSON.stringify({
            address: document.querySelector("#whaleAddress").value,
            chain: document.querySelector("#whaleChain").value,
            label: document.querySelector("#whaleLabel").value,
          }),
        });
        walletForm.reset();
        await loadWhaleModule();
      } catch (error) {
        console.warn(error);
        setWhaleStatus("Không thêm được ví", true);
      }
    });
  }

  if (thresholdForm) {
    thresholdForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      try {
        await whaleRequest("/settings/threshold", {
          method: "PUT",
          body: JSON.stringify({
            threshold_usd: Number(document.querySelector("#whaleThreshold").value || 0),
          }),
        });
        document.querySelector("#whaleThresholdValue").textContent = formatWhaleUsd(
          Number(document.querySelector("#whaleThreshold").value || 0),
        );
        setWhaleStatus("Đã lưu threshold");
      } catch (error) {
        console.warn(error);
        setWhaleStatus("Không lưu được threshold", true);
      }
    });
  }

  if (walletList) {
    walletList.addEventListener("click", async (event) => {
      const toggle = event.target.closest("[data-whale-toggle]");
      const edit = event.target.closest("[data-whale-edit]");
      const remove = event.target.closest("[data-whale-delete]");

      try {
        if (toggle) {
          await whaleRequest(`/wallets/${toggle.dataset.whaleToggle}`, {
            method: "PATCH",
            body: JSON.stringify({ is_active: toggle.dataset.active !== "true" }),
          });
        }

        if (edit) {
          const label = prompt("Nhãn ví mới", edit.dataset.label);
          if (!label) return;
          await whaleRequest(`/wallets/${edit.dataset.whaleEdit}`, {
            method: "PATCH",
            body: JSON.stringify({ label }),
          });
        }

        if (remove) {
          await whaleRequest(`/wallets/${remove.dataset.whaleDelete}`, { method: "DELETE" });
        }

        await loadWhaleModule();
      } catch (error) {
        console.warn(error);
        setWhaleStatus("Thao tác ví lỗi", true);
      }
    });
  }
}

bindWhaleForms();
loadWhaleModule();
connectWhaleSocket();
