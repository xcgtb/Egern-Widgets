/**
 * ==========================================
 * 📌 代码名称: 🪙 Crypto Dashboard (精简无底栏 + 右上角时间)
 * ==========================================
 */
export default async function(ctx) {
  // 🎨 苹果原生 UI 规范颜色
  const THEME = {
    bg:      { light: '#FFFFFF', dark: '#121212' }, 
    text:    { light: '#1C1C1E', dark: '#FFFFFF' }, 
    textSec: { light: '#8E8E93', dark: '#8E8E93' }, 
    white:   { light: '#FFFFFF', dark: '#FFFFFF' }, 
    green:   { light: '#00C805', dark: '#30D158' }, 
    red:     { light: '#FF3B30', dark: '#FF453A' }  
  };

  const SYMBOLS = '["BTCUSDT","ETHUSDT","BNBUSDT"]';
  const API_URL = `https://api.binance.com/api/v3/ticker/24hr?symbols=${encodeURIComponent(SYMBOLS)}`;

  const COIN_MAP = {
    "BTCUSDT": { symbol: "BTC", icon: "bitcoinsign.circle.fill", color: "#F7931A" },
    "ETHUSDT": { symbol: "ETH", icon: "diamond.fill",            color: "#627EEA" },
    "BNBUSDT": { symbol: "BNB", icon: "hexagon.fill",            color: "#F3BA2F" }
  };

  const RENDER_ORDER = ["BTCUSDT", "ETHUSDT", "BNBUSDT"];

  const formatPrice = (price, decimals = 2) => {
    if (price < 1) return "$" + price.toFixed(4);
    return "$" + price.toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  };

  const formatChange = (change) => {
    if (change == null) return "+0.00%";
    const sign = change >= 0 ? "+" : "";
    return sign + change.toFixed(2) + "%"; 
  };

  const formatVol = (vol) => {
    const v = parseFloat(vol);
    if (v >= 1e9) return (v / 1e9).toFixed(1) + "B";
    if (v >= 1e6) return (v / 1e6).toFixed(1) + "M";
    if (v >= 1e3) return (v / 1e3).toFixed(1) + "K";
    return v.toFixed(0);
  };

  const changeColor = (change) => change >= 0 ? THEME.green : THEME.red;

  const txt = (text, fontSize, weight, color, opts) => ({
    type: "text",
    text: text,
    font: { weight: weight || "regular", size: fontSize }, 
    textColor: color || THEME.text,
    ...opts
  });

  const icon = (systemName, size, tintColor, opts) => ({
    type: "image",
    src: "sf-symbol:" + systemName,
    width: size,
    height: size,
    color: tintColor || THEME.text,
    ...opts
  });

  const hstack = (children, opts) => ({ type: "stack", direction: "row", alignItems: "center", children, ...opts });
  const vstack = (children, opts) => ({ type: "stack", direction: "column", alignItems: "start", children, ...opts });
  const spacer = (length) => length != null ? { type: "spacer", length } : { type: "spacer" };

  const dateTxt = (dateStr, style, fontSize, weight, color) => ({
    type: "date",
    date: dateStr,
    format: style,
    font: { size: fontSize, weight: weight || "medium" },
    textColor: color || THEME.textSec,
  });

  const coinIcon = (info, size) => {
    const pad = Math.round(size * 0.25);
    const total = size + pad * 2;
    return vstack([icon(info.icon, size, info.color)], {
      alignItems: "center",
      padding: [pad, pad, pad, pad],
      backgroundColor: info.color + "20",
      borderRadius: total / 2,
    });
  };

  // 💡 修改：顶部标题栏加入右上角时间
  const headerBar = () => hstack([
    icon("chart.line.uptrend.xyaxis.circle.fill", 12, THEME.text),
    spacer(4),
    txt("Crypto Dashboard", 13, "bold", THEME.text),
    spacer(), // 弹簧撑开，把时间推到最右侧
    dateTxt(new Date().toISOString(), "time", 10, "medium", THEME.textSec) // 右上角的时间
  ]);

  const coinListItem = (id, priceInfo) => {
    const info = COIN_MAP[id];
    const price = parseFloat(priceInfo.lastPrice);
    const high = parseFloat(priceInfo.highPrice);
    const low = parseFloat(priceInfo.lowPrice);
    const change = parseFloat(priceInfo.priceChangePercent);
    const quoteVol = parseFloat(priceInfo.quoteVolume);

    const leftCol = hstack([
      coinIcon(info, 16), 
      spacer(8),
      vstack([
        txt(info.symbol, 14, "bold", THEME.text),
        spacer(1),
        txt("Vol:" + formatVol(quoteVol), 9, "medium", THEME.textSec)
      ])
    ]);

    const midCol = vstack([
      txt(formatPrice(price), 14, "bold", THEME.text),
      spacer(1),
      txt(`H:${formatPrice(high).replace('$', '')} L:${formatPrice(low).replace('$', '')}`, 9, "medium", THEME.textSec)
    ], { alignItems: "end" });

    const rightPill = vstack([
      txt(formatChange(change), 11, "bold", THEME.white)
    ], {
      backgroundColor: changeColor(change),
      borderRadius: 4,           
      padding: [3, 6, 3, 6],   
      alignItems: "center"
    });

    return hstack([
      leftCol,
      spacer(),   
      midCol,
      spacer(10), 
      rightPill
    ]); 
  };

  const family = ctx.widgetFamily;
  try {
    const resp = await ctx.http.get(API_URL);
    const pricesArray = await resp.json(); 
    const prices = {};
    for (const item of pricesArray) {
      prices[item.symbol] = item;
    }
    
    let widget;
    if (family === "systemMedium" || !family) {
      const listRows = RENDER_ORDER.map(id => coinListItem(id, prices[id]));
      const content = [];
      for (let i = 0; i < listRows.length; i++) {
        content.push(listRows[i]);
        if (i < listRows.length - 1) content.push(spacer(12)); 
      }

      widget = {
        type: "widget",
        // 💡 调整：去掉了底栏后，把上下边距改为对称的 16，让整体内容垂直居中更完美
        padding: [16, 16, 16, 16], 
        backgroundColor: THEME.bg,
        children: [
          headerBar(), // 插入头部（带右上角时间）
          spacer(14),  // 增加头部和列表之间的呼吸感
          vstack(content, { flex: 1, justifyContent: "center" })
          // 去掉了底部的 spacer 和 footerBar
        ]
      };
    } else {
      widget = {
        type: "widget", padding: [16, 20], backgroundColor: THEME.bg,
        children: [{ type: "text", text: "Please use Medium widget.", font: { size: 14 }, textColor: THEME.text }]
      };
    }

    widget.refreshAfter = new Date(Date.now() + 60 * 1000).toISOString();
    return widget;
  } catch (e) {
    return {
      type: "widget", padding: [16, 20], backgroundColor: THEME.bg,
      children: [{ type: "text", text: "⚠️ 数据加载失败", font: { size: 14, weight: "bold" }, textColor: THEME.red }]
    };
  }
}