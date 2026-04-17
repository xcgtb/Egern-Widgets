/**
 * ==========================================
 * 📌 代码名称: 🪙 Crypto Dashboard (4 大主流币 宽广舒展版)
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

  // 💡 只保留 4 个绝对主流的币种：BTC, ETH, SOL, BNB
  const COINS = "bitcoin,ethereum,solana,binancecoin";
  const API_URL = `https://api.coingecko.com/api/v3/simple/price?ids=${COINS}&vs_currencies=usd&include_24hr_change=true`;

  const COIN_MAP = {
    bitcoin:      { symbol: "BTC",  name: "Bitcoin",   icon: "bitcoinsign.circle.fill",  color: "#F7931A" },
    ethereum:     { symbol: "ETH",  name: "Ethereum",  icon: "diamond.fill",             color: "#627EEA" },
    solana:       { symbol: "SOL",  name: "Solana",    icon: "sun.max.fill",             color: "#9945FF" },
    binancecoin:  { symbol: "BNB",  name: "BNB Chain", icon: "hexagon.fill",             color: "#F3BA2F" }
  };

  const ALL_IDS = Object.keys(COIN_MAP);

  const formatPrice = (price) => {
    if (price >= 1000) return "$" + price.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    if (price >= 1) return "$" + price.toFixed(2);
    return "$" + price.toFixed(4);
  };

  const formatChange = (change) => {
    if (change == null) return "+0.0%";
    const sign = change >= 0 ? "+" : "";
    return sign + change.toFixed(2) + "%"; // 空间大了，涨跌幅可以保留两位小数
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
      backgroundColor: info.color + "25", // 降低一点背景透明度，看起来更高级
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
    txt("CoinGecko", 10, "medium", THEME.textSec),
  ], { gap: 4 });

  // 🌟 放大版的网格图块
  const coinGridItem = (id, data) => {
    const info = COIN_MAP[id];
    const change = data.usd_24h_change;

    return vstack([
      coinIcon(info, 22), // 图标放大
      spacer(8),
      txt(info.symbol, 14, "bold", THEME.text), // 币种代号放大
      spacer(3),
      txt(formatPrice(data.usd), 12, "medium", THEME.text, { maxLines: 1 }), // 价格放大
      spacer(2),
      txt(formatChange(change), 11, "bold", changeColor(change)) // 涨跌幅放大
    ], { alignItems: "center", flex: 1 }); 
  };

  const filterAvailable = (ids, prices) => ids.filter(id => prices[id]);

  const family = ctx.widgetFamily;
  try {
    const resp = await ctx.http.get(API_URL);
    const prices = await resp.json();
    
    let widget;
    
    // ==========================================
    // 中尺寸组件 (1x4 舒展网格布局)
    // ==========================================
    if (family === "systemMedium" || !family) {
      const ids = filterAvailable(ALL_IDS, prices);
      
      // 一排 4 个直接铺开
      const mainRow = ids.map(id => coinGridItem(id, prices[id]));

      widget = {
        type: "widget",
        gap: 0,
        padding: [16, 20], // 增加整体边缘留白
        backgroundColor: THEME.bg,
        children: [
          headerBar("Majors Dashboard", 15, 16, true), // 标题也适当放大
          spacer(), // 使用弹性空间把内容推到中间
          
          // 核心数据区：1行4列
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
    return {
      type: "widget", padding: [16, 20], backgroundColor: THEME.bg,
      children: [{ type: "text", text: "网络加载失败或 API 限制", font: { size: 14, weight: "medium" }, textColor: THEME.red }]
    };
  }
}
