/**
 * ==========================================
 * 📌 代码名称: 🪙 Crypto Dashboard (4 大主流币 币安稳定版)
 * ==========================================
 */
export default async function(ctx) {
  // 🎨 苹果原生 UI 规范颜色
  const THEME = {
    bg:      { light: '#FFFFFF', dark: '#121212' }, 
    text:    { light: '#1C1C1E', dark: '#FFFFFF' }, 
    textSec: { light: '#8E8E93', dark: '#8E8E93' }, 
    line:    { light: '#E5E5EA', dark: '#38383A' }, 
    accent:  { light: '#1C1C1E', dark: '#FFFFFF' }, 
    green:   { light: '#34C759', dark: '#30D158' }, 
    red:     { light: '#FF3B30', dark: '#FF453A' }  
  };

  // 💡 改用币安 (Binance) API，稳定性极高，不易被风控限制
  const SYMBOLS = '["BTCUSDT","ETHUSDT","SOLUSDT","BNBUSDT"]';
  const API_URL = `https://api.binance.com/api/v3/ticker/24hr?symbols=${encodeURIComponent(SYMBOLS)}`;

  // 映射字典改为匹配币安的 Symbol
  const COIN_MAP = {
    "BTCUSDT": { symbol: "BTC",  name: "Bitcoin",   icon: "bitcoinsign.circle.fill",  color: "#F7931A" },
    "ETHUSDT": { symbol: "ETH",  name: "Ethereum",  icon: "diamond.fill",             color: "#627EEA" },
    "SOLUSDT": { symbol: "SOL",  name: "Solana",    icon: "sun.max.fill",             color: "#9945FF" },
    "BNBUSDT": { symbol: "BNB",  name: "BNB Chain", icon: "hexagon.fill",             color: "#F3BA2F" }
  };

  // 保证按照固定的顺序渲染
  const RENDER_ORDER = ["BTCUSDT", "ETHUSDT", "SOLUSDT", "BNBUSDT"];

  const formatPrice = (price) => {
    if (price >= 1000) return "$" + price.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    if (price >= 1) return "$" + price.toFixed(2);
    return "$" + price.toFixed(4);
  };

  const formatChange = (change) => {
    if (change == null) return "+0.0%";
    const sign = change >= 0 ? "+" : "";
    return sign + change.toFixed(2) + "%"; 
  };

  const changeColor = (change) => change >= 0 ? THEME.green : THEME.red;

  const txt = (text, fontSize, weight, color, opts) => ({
    type: "text",
    text: text,
    font: { weight: weight || "regular", size: fontSize, family: "Menlo" },
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
    const pad = Math.round(size * 0.3);
    const total = size + pad * 2;
    return vstack([icon(info.icon, size, info.color)], {
      alignItems: "center",
      padding: [pad, pad, pad, pad],
      backgroundColor: info.color + "25", 
      borderRadius: total / 2,
    });
  };

  const headerBar = (title, titleSize, iconSize, showTime) => {
    const children = [
      icon("chart.line.uptrend.xyaxis.circle.fill", iconSize, THEME.accent),
      txt(title, titleSize, "heavy", THEME.accent),
      spacer(),
    ];
    if (showTime) {
      children.push(dateTxt(new Date().toISOString(), "time", Math.max(9, titleSize - 4), "medium", THEME.textSec));
    }
    return hstack(children, { gap: 6 });
  };

  const footerBar = () => hstack([
    icon("clock.arrow.circlepath", 10, THEME.textSec),
    dateTxt(new Date().toISOString(), "relative", 10, "medium", THEME.textSec),
    spacer(),
    txt("Binance", 10, "medium", THEME.textSec), // 数据源标识改为币安
  ], { gap: 4 });

  const coinGridItem = (id, priceInfo) => {
    const info = COIN_MAP[id];
    const price = parseFloat(priceInfo.lastPrice);
    const change = parseFloat(priceInfo.priceChangePercent);

    return vstack([
      coinIcon(info, 22), 
      spacer(8),
      txt(info.symbol, 14, "bold", THEME.text), 
      spacer(3),
      txt(formatPrice(price), 12, "medium", THEME.text, { maxLines: 1 }), 
      spacer(2),
      txt(formatChange(change), 11, "bold", changeColor(change)) 
    ], { alignItems: "center", flex: 1 }); 
  };

  const family = ctx.widgetFamily;
  try {
    const resp = await ctx.http.get(API_URL);
    // 币安返回的是个数组: [{symbol: "BTCUSDT", lastPrice: "...", priceChangePercent: "..."}, ...]
    const pricesArray = await resp.json(); 
    
    // 把数组转成更好查的字典 { "BTCUSDT": {...}, ... }
    const prices = {};
    for (const item of pricesArray) {
      prices[item.symbol] = item;
    }
    
    let widget;
    
    // ==========================================
    // 中尺寸组件 (1x4 舒展网格布局)
    // ==========================================
    if (family === "systemMedium" || !family) {
      // 按照 RENDER_ORDER 的顺序映射出图块
      const mainRow = RENDER_ORDER.map(id => coinGridItem(id, prices[id]));

      widget = {
        type: "widget",
        gap: 0,
        padding: [16, 20], 
        backgroundColor: THEME.bg,
        children: [
          headerBar("Majors Dashboard", 15, 16, true), 
          spacer(), 
          hstack(mainRow, { gap: 12, alignItems: "center" }),
          spacer(),
          footerBar(),
        ]
      };
    } 
    else {
      widget = {
        type: "widget", padding: [16, 20], backgroundColor: THEME.bg,
        children: [{ type: "text", text: "Please use Medium widget for 4 coins.", font: { size: 14 }, textColor: THEME.text }]
      };
    }

    widget.refreshAfter = new Date(Date.now() + 60 * 1000).toISOString();
    return widget;
  } catch (e) {
    // 捕获到错误时打印具体的提示，避免彻底白屏
    return {
      type: "widget", padding: [16, 20], backgroundColor: THEME.bg,
      children: [
        { type: "text", text: "⚠️ 数据请求失败", font: { size: 16, weight: "bold" }, textColor: THEME.red },
        { type: "spacer", length: 8 },
        { type: "text", text: "请检查网络或稍后再试。", font: { size: 12, weight: "medium" }, textColor: THEME.textSec }
      ]
    };
  }
}
