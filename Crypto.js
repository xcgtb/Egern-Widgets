/**
 * ==========================================
 * 📌 代码名称: 🪙 Crypto Dashboard (图标进化竖向版)
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

  // 💡 给每个币种配上专属的系统图标和品牌主色调
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

  // 💡 新增：格式化交易量 (将长数字转为 K/M/B)
  const formatVol = (vol) => {
    const v = parseFloat(vol);
    if (v >= 1e9) return (v / 1e9).toFixed(2) + "B";
    if (v >= 1e6) return (v / 1e6).toFixed(2) + "M";
    if (v >= 1e3) return (v / 1e3).toFixed(2) + "K";
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

  // 💡 新增：带透明背景的圆形币种 Icon
  const coinIcon = (info, size) => {
    const pad = Math.round(size * 0.25);
    const total = size + pad * 2;
    return vstack([icon(info.icon, size, info.color)], {
      alignItems: "center",
      padding: [pad, pad, pad, pad],
      backgroundColor: info.color + "20", // 20 相当于 12% 左右透明度
      borderRadius: total / 2,
    });
  };

  // ==========================================
  // 构建单行列表项 (带图标进化版)
  // ==========================================
  const coinListItem = (id, priceInfo) => {
    const info = COIN_MAP[id];
    const price = parseFloat(priceInfo.lastPrice);
    const high = parseFloat(priceInfo.highPrice);
    const low = parseFloat(priceInfo.lowPrice);
    const change = parseFloat(priceInfo.priceChangePercent);
    const quoteVol = parseFloat(priceInfo.quoteVolume); // 取 USDT 交易额

    // 左列：Icon图标 + (大号缩写 + 交易量)
    const leftCol = hstack([
      coinIcon(info, 18), // 渲染彩色图标
      spacer(10),
      vstack([
        txt(info.symbol, 16, "bold", THEME.text),
        spacer(2),
        txt("Vol:" + formatVol(quoteVol), 10, "medium", THEME.textSec) // 加入交易量
      ])
    ]);

    // 中列：当前价格 + 高低点
    const midCol = vstack([
      txt(formatPrice(price), 16, "bold", THEME.text),
      spacer(2),
      txt(`H:${formatPrice(high).replace('$', '')} L:${formatPrice(low).replace('$', '')}`, 10, "medium", THEME.textSec)
    ], { alignItems: "end" });

    // 右列：涨跌幅色块
    const rightPill = vstack([
      txt(formatChange(change), 12, "bold", THEME.white)
    ], {
      backgroundColor: changeColor(change),
      borderRadius: 5,           
      padding: [4, 8, 4, 8],   
      alignItems: "center"
    });

    return hstack([
      leftCol,
      spacer(),   
      midCol,
      spacer(12), 
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
        if (i < listRows.length - 1) content.push(spacer(16)); 
      }

      widget = {
        type: "widget",
        padding: [20, 16, 20, 16], // 稍微调整左右边距给图标让出空间
        backgroundColor: THEME.bg,
        children: [
          vstack(content, { flex: 1, justifyContent: "center" })
        ]
      };
    } 
    else {
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
      children: [
        { type: "text", text: "⚠️ 数据加载失败", font: { size: 14, weight: "bold" }, textColor: THEME.red },
        { type: "spacer", length: 8 },
        { type: "text", text: "请检查网络或稍后再试", font: { size: 12, weight: "medium" }, textColor: THEME.textSec }
      ]
    };
  }
}