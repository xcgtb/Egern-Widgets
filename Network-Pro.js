/**
 * 📌 桌面小组件: 🛡️ 网络诊断雷达 (全栈解锁 Pro 版 - 终极缓存与高精中文版)
 * 🎨 全面优化首次加载请求风暴，集成 Smart TTL、网络环境锁与双层高精中文城市映射
 * 文件名: Network-Pro.js
 */
export default async function(ctx) {
  // 1. 统一 UI 规范颜色 (全局 C 对象)
  const C = {
    bg: { light: '#FFFFFF', dark: '#121212' },       
    barBg: { light: '#0000001A', dark: '#FFFFFF22' },
    text: { light: '#1C1C1E', dark: '#FFFFFF' },     
    dim: { light: '#8E8E93', dark: '#8E8E93' },      
    
    cpu: { light: '#007AFF', dark: '#0A84FF' },      // 用于左侧本地列
    mem: { light: '#AF52DE', dark: '#BF5AF2' },      // 用于右侧代理列
    disk: { light: '#FF9500', dark: '#FF9F0A' },     // 用于中危/机房
    netRx: { light: '#34C759', dark: '#30D158' },    // 用于纯净/原生住宅 (绿)
    netTx: { light: '#5856D6', dark: '#5E5CE6' },    
    
    yellow: { light: '#FFCC00', dark: '#FFD60A' },
    red: { light: '#FF3B30', dark: '#FF453A' }
  };

  // --- 基础配置与安全解析 ---
  const CACHE_KEY = "network_radar_master_cache";
  const CACHE_TTL = 15 * 60 * 1000; // 缓存有效期定为 15 分钟

  const safeParse = (text) => {
    if (!text) return {};
    try { return JSON.parse(text); } catch { return {}; }
  };

  const fmtProxyISP = (isp) => {
    if (!isp) return "未知";
    let s = String(isp);
    if (/it7/i.test(s)) return "IT7 Network";
    if (/dmit/i.test(s)) return "DMIT Network";
    if (/cloudflare/i.test(s)) return "Cloudflare";
    if (/akamai/i.test(s)) return "Akamai";
    if (/amazon|aws/i.test(s)) return "AWS";
    if (/google/i.test(s)) return "Google Cloud";
    if (/microsoft|azure/i.test(s)) return "Azure";
    if (/alibaba|aliyun/i.test(s)) return "阿里云";
    if (/tencent/i.test(s)) return "腾讯云";
    if (/oracle/i.test(s)) return "Oracle Cloud";
    return s.length > 11 ? s.substring(0, 11) + "..." : s; 
  };

  const getFlag = (code) => {
    if (!code || code.toUpperCase() === 'TW') return '🇨🇳'; 
    if (code.toUpperCase() === 'XX' || code === 'OK') return '✅';
    return String.fromCodePoint(...code.toUpperCase().split('').map(c => 127397 + c.charCodeAt()));
  };

  // --- 持久化缓存读写 ---
  const getCache = async () => {
    try { return ctx.storage && typeof ctx.storage.get === 'function' ? await ctx.storage.get(CACHE_KEY) : null; } catch { return null; }
  };
  const setCache = async (val) => {
    try { if (ctx.storage && typeof ctx.storage.set === 'function') { await ctx.storage.set(CACHE_KEY, val); } } catch {}
  };

  // 高级浏览器请求头伪装
  const BASE_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
  const commonHeaders = { 
    "User-Agent": BASE_UA, 
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
    "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
    "Cache-Control": "no-cache"
  };

  const readBody = async (r) => {
    if (!r) return "";
    if (typeof r.body === "string" && r.body.length) return r.body;
    if (typeof r.text === "function") {
      try { const t = await r.text(); return typeof t === "string" ? t : ""; } catch { return ""; }
    }
    return "";
  };

  // 2. 获取本地网络状态与生成网络锁（Network Key）
  const d = ctx.device || {};
  const isWifi = !!d.wifi?.ssid;
  let netName = "未连接", netIcon = "antenna.radiowaves.left.and.right";
  
  const netInfo = (typeof $network !== 'undefined') ? $network : (ctx.network || {});
  let localIp = netInfo.v4?.primaryAddress || d.ipv4?.address || "获取失败";
  let gateway = netInfo.v4?.primaryRouter || d.ipv4?.gateway || "无网关";

  let networkLockKey = "no_connection";
  if (isWifi) { 
    netName = d.wifi.ssid; 
    netIcon = "wifi"; 
    networkLockKey = `wifi_${d.wifi.ssid}`;
  } else if (d.cellular?.radio) {
    const radioMap = { "GPRS": "2.5G", "EDGE": "2.75G", "WCDMA": "3G", "LTE": "4G", "NR": "5G", "NRNSA": "5G" };
    const cellType = radioMap[d.cellular.radio.toUpperCase().replace(/\s+/g, "")] || d.cellular.radio;
    netName = cellType;
    gateway = "蜂窝内网";
    networkLockKey = `cellular_${cellType}`;
  }

  // 3. 基础必备实时请求（无论是否命中缓存，延迟与本地公网 IP 必须实时刷新）
  const fetchLocal = async () => {
    try {
      const res = await ctx.http.get('https://myip.ipip.net/json', { headers: commonHeaders, timeout: 3500 });
      const body = safeParse(await res.text());
      if (body?.data?.ip) return { ip: body.data.ip, loc: `${body.data.location[1] || ""} ${body.data.location[2] || ""}`.trim() };
    } catch (e) {}
    return { ip: "获取失败", loc: "未知" };
  };

  const fetchProxyRawIP = async () => {
    try {
      const res = await ctx.http.get('https://v4.ident.me', { timeout: 3000 });
      const ip = (await res.text())?.trim();
      return /^[0-9.]+$/.test(ip) ? ip : null;
    } catch { return null; }
  };

  const fetchLocalDelay = async () => {
    const start = Date.now();
    try { await ctx.http.get('https://www.baidu.com', { timeout: 2000 }); return `${Date.now() - start} ms`; } catch (e) { return "超时"; }
  };

  const fetchProxyDelay = async () => {
    const start = Date.now();
    try { await ctx.http.get('https://cp.cloudflare.com/generate_204', { timeout: 2000 }); return `${Date.now() - start} ms`; } catch (e) { return "超时"; }
  };

  // --- 流媒体与 AI 解锁原始检测逻辑 ---
  async function checkNetflix() {
    try {
      const checkStatus = async (id) => {
        const r = await ctx.http.get(`https://www.netflix.com/title/${id}`, { timeout: 3500, headers: commonHeaders, followRedirect: false }).catch(() => null);
        return r ? r.status : 0;
      };
      return (await checkStatus(70143836)) === 200 ? "OK" : ((await checkStatus(81280792)) === 200 ? "🍿" : "❌");
    } catch { return "❌"; }
  }

  async function checkDisney() {
    try {
      const res = await ctx.http.get("https://www.disneyplus.com", { timeout: 3500, headers: commonHeaders, followRedirect: false }).catch(() => null);
      if (!res || res.status === 403) return "❌";
      return (res.headers?.location || res.headers?.Location || "").includes("unavailable") ? "❌" : "OK";
    } catch { return "❌"; }
  }

  async function checkTikTok() {
    try {
      const r = await ctx.http.get("https://www.tiktok.com/explore", { timeout: 3500, headers: commonHeaders, followRedirect: false }).catch(() => null);
      if (!r || r.status === 403 || r.status === 401) return "❌";
      const body = await readBody(r);
      if (body.includes("Access Denied") || body.includes("Please wait...")) return "❌";
      const m = body.match(/"region":"([A-Z]{2})"/i);
      return m?.[1] ? m[1].toUpperCase() : "OK";
    } catch { return "❌"; }
  }

  async function checkChatGPT() {
    try {
      const traceRes = await ctx.http.get("https://chatgpt.com/cdn-cgi/trace", { timeout: 3000 }).catch(() => null);
      const m = (await readBody(traceRes))?.match(/loc=([A-Z]{2})/);
      return m?.[1] ? m[1].toUpperCase() : "OK";
    } catch { return "❌"; }
  }

  async function checkClaude() {
    try {
      const res = await ctx.http.get("https://claude.ai/login", { timeout: 4000, headers: commonHeaders }).catch(() => null);
      if (!res) return "❌";
      const body = await readBody(res);
      if (body.includes("App unavailable") || body.includes("certain regions")) return "❌";
      if (res.status === 403 && (body.includes("cf-turnstile") || body.includes("Just a moment"))) return "OK";
      return (res.status === 200 || res.status === 301 || res.status === 302) ? "OK" : "❌";
    } catch { return "❌"; }
  }

  async function checkGemini() {
    try {
      const res = await ctx.http.get("https://gemini.google.com/app", { timeout: 3500, headers: commonHeaders, followRedirect: false }).catch(() => null);
      return (!res || (res.headers?.location || res.headers?.Location || "").includes("faq")) ? "❌" : "OK";
    } catch { return "❌"; }
  }

  // 执行第一阶段轻量并发请求
  const [localData, proxyRawIP, localDelay, proxyDelay] = await Promise.all([
    fetchLocal(), fetchProxyRawIP(), fetchLocalDelay(), fetchProxyDelay()
  ]);

  // 4. 第二阶段：多维联动智能缓存调度与高级汉化字典
  const currentIP = proxyRawIP || "获取失败";
  const rawCache = await getCache();
  const masterCache = rawCache ? safeParse(rawCache) : null;

  let finalProxy = null;
  let finalPurity = null;
  let finalUnlocks = null;

  // 检查缓存状态 (IP一致 且 网络锁未变 且 未过TTL时间)
  if (masterCache && 
      masterCache.ip === currentIP && 
      masterCache.networkLock === networkLockKey && 
      (Date.now() - masterCache.timestamp < CACHE_TTL)) {
    
    // 🔥 完美命中缓存：直接同步读取历史数据，本轮跳过后续 8 个重度请求！
    finalProxy = masterCache.proxyData;
    finalPurity = masterCache.purityData;
    finalUnlocks = masterCache.unlocks;
  } else {
    // 🔄 缓存失效 / 穿透检测：发起流媒体检测与厂商画像查询
    const fetchProxyFull = async () => {
      try { const res = await ctx.http.get('https://ipapi.co/json/', { timeout: 4000 }); return safeParse(await res.text()); } catch { return {}; }
    };
    const fetchPurityFull = async () => {
      try { const res = await ctx.http.get('https://my.ippure.com/v1/info', { timeout: 4000 }); return safeParse(await res.text()); } catch { return {}; }
    };

    const [fullData, purData, rNF, rDP, rTK, rGPT, rCL, rGM] = await Promise.all([
      fetchProxyFull(), fetchPurityFull(),
      checkNetflix(), checkDisney(), checkTikTok(), checkChatGPT(), checkClaude(), checkGemini()
    ]);

    const cc = fullData.country_code || "XX";
    
    // 全球主流及延伸代理节点中文映射字典
    const ccMap = {
      "HK": "香港", "SG": "新加坡", "JP": "日本", "US": "美国", "TW": "台湾", 
      "KR": "韩国", "UK": "英国", "DE": "德国", "FR": "法国", "NL": "荷兰", 
      "RU": "俄罗斯", "CN": "中国", "MY": "马来西亚", "TH": "泰国", "VN": "越南", 
      "PH": "菲律宾", "IN": "印度", "ID": "印尼", "AU": "澳大利亚", "CA": "加拿大", 
      "BR": "巴西", "MX": "墨西哥", "ZA": "南非", "TR": "土耳其", "UA": "乌克兰", 
      "AE": "阿联酋", "SA": "沙特", "IT": "意大利", "ES": "西班牙", "CH": "瑞士",
      "SE": "瑞典", "NO": "挪威", "FI": "芬兰", "DK": "丹麦", "NZ": "新西兰"
    };

    // 核心中转/落地落地城市中文映射字典
    const cityMap = {
      "tokyo": "东京", "hong kong": "香港", "singapore": "新加坡", 
      "los angeles": "洛杉矶", "san francisco": "旧金山", "new york": "纽约", 
      "seattle": "西雅图", "london": "伦敦", "paris": "巴黎", 
      "frankfurt": "法兰克福", "seoul": "首尔", "taipei": "台北", 
      "bangkok": "曼谷", "sanjose": "圣何塞", "san jose": "圣何塞",
      "santa clara": "圣克拉拉", "chicago": "芝加哥", "miami": "迈阿密",
      "amsterdam": "阿姆斯坦丹", "manila": "马尼拉", "mumbai": "孟买",
      "osaka": "大阪", "seover": "首尔", "oregon": "俄勒冈", "ashburn": "阿什本"
    };

    const cityName = fullData.city || "";
    const cnCountry = ccMap[cc.toUpperCase()] || fullData.country_name || "未知";
    const cnCity = cityMap[cityName.toLowerCase()] || cityName;
    
    // 智能防重叠地名合并逻辑（如：新加坡 新新加坡 -> 新加坡）
    const finalLocationString = (cnCountry === cnCity || cnCity === "") ? cnCountry : `${cnCountry} ${cnCity}`;

    finalProxy = {
      ip: fullData.ip || currentIP,
      loc: `${getFlag(cc)} ${finalLocationString}`.trim(),
      isp: fmtProxyISP(fullData.org || fullData.asn),
      cc: cc
    };
    finalPurity = purData;
    finalUnlocks = { rNF, rDP, rTK, rGPT, rCL, rGM };

    // 写入全新周期主缓存
    if (currentIP !== "获取失败" && fullData.ip) {
      await setCache(JSON.stringify({
        ip: currentIP,
        networkLock: networkLockKey,
        timestamp: Date.now(),
        proxyData: finalProxy,
        purityData: finalPurity,
        unlocks: finalUnlocks
      }));
    }
  }

  // 5. 数据清洗与规范化转换
  const isRes = finalPurity?.isResidential;
  let nativeText = "未知属性", nativeIc = "questionmark.building.fill", nativeCol = C.dim;
  if (isRes === true) { nativeText = "原生住宅"; nativeIc = "house.fill"; nativeCol = C.netRx; } 
  else if (isRes === false) { nativeText = "商业机房"; nativeIc = "building.2.fill"; nativeCol = C.disk; }

  const risk = finalPurity?.fraudScore;
  let riskTxt = "无数据", riskCol = C.dim, riskIc = "questionmark.circle.fill";
  if (risk !== undefined && risk !== null) {
    if (risk >= 70) { riskTxt = `高危 (${risk})`; riskCol = C.red; riskIc = "xmark.shield.fill"; } 
    else if (risk >= 30) { riskTxt = `中危 (${risk})`; riskCol = C.disk; riskIc = "exclamationmark.triangle.fill"; } 
    else { riskTxt = `纯净 (${risk})`; riskCol = C.netRx; riskIc = "checkmark.shield.fill"; }
  }

  const fmtUnlock = (name, res, cc) => {
    let flag = "🚫";
    if (res === "🍿" || res === "APP") flag = res;
    else if (res !== "❌") flag = getFlag(res === "OK" || res === "XX" ? cc : res);
    return `${name} ${flag}`; 
  };
  
  const textVideo = `${fmtUnlock('NF', finalUnlocks.rNF, finalProxy.cc)}  ${fmtUnlock('DP', finalUnlocks.rDP, finalProxy.cc)}  ${fmtUnlock('TK', finalUnlocks.rTK, finalProxy.cc)}`;
  const textAI = `${fmtUnlock('GPT', finalUnlocks.rGPT, finalProxy.cc)}  ${fmtUnlock('CL', finalUnlocks.rCL, finalProxy.cc)}  ${fmtUnlock('GM', finalUnlocks.rGM, finalProxy.cc)}`;

  const now = new Date();
  const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const TIME_COL = { light: 'rgba(0,0,0,0.3)', dark: 'rgba(255,255,255,0.3)' };

  // 6. 抗挤压自适应网格行组件
  const Row = (ic, icCol, label, val, valCol) => ({
    type: 'stack', direction: 'row', alignItems: 'center', gap: 5,
    children: [
      { type: 'image', src: `sf-symbol:${ic}`, color: icCol, width: 11, height: 11 },
      { type: 'text', text: label, font: { size: 10.5, weight: 'regular' }, textColor: C.dim, maxLines: 1, minScale: 0.85 }, 
      { type: 'spacer' },
      { type: 'text', text: val, font: { size: 10.5, weight: 'medium' }, textColor: valCol, maxLines: 1, minScale: 0.75 }
    ]
  });

  // 7. UI 输出结构
  return {
    type: 'widget', 
    padding: 14,
    backgroundColor: C.bg, 
    children: [
      // 顶部 Header 栏
      { type: 'stack', direction: 'row', alignItems: 'center', gap: 6, children: [
          { type: 'image', src: 'sf-symbol:waveform.path.ecg', color: C.text, width: 16, height: 16 },
          { type: 'text', text: '网络诊断雷达', font: { size: 14, weight: 'bold' }, textColor: C.text },
          { type: 'spacer' },
          { type: 'text', text: timeStr, font: { size: 10, weight: 'medium' }, textColor: TIME_COL }
      ]},
      { type: 'spacer', length: 12 }, 
      
      // 左右分栏核心网格
      { type: 'stack', direction: 'row', gap: 10, children: [
          
          // 【左边栏】：本地承载网络与影视
          { type: 'stack', direction: 'column', gap: 4.5, flex: 1, children: [
              Row(netIcon, C.cpu, "环境", netName, C.text),
              Row("wifi.router.fill", C.cpu, "网关", gateway, C.text),
              Row("iphone", C.cpu, "内网", localIp, C.text),
              Row("globe.asia.australia.fill", C.cpu, "公网", localData.ip, C.text),
              Row("map.fill", C.cpu, "位置", localData.loc, C.text),
              Row("timer", C.cpu, "延迟", localDelay, C.text), 
              Row("play.tv.fill", C.cpu, "影视", textVideo, C.text) 
          ]},

          // ✂️ 中央垂直分割线
          { type: 'stack', width: 0.5, backgroundColor: C.barBg },
          
          // 【右边栏】：中转代理出口与 AI 节点
          { type: 'stack', direction: 'column', gap: 4.5, flex: 1, children: [
              Row("paperplane.fill", C.mem, "出口", finalProxy.ip, C.text),
              Row("mappin.and.ellipse", C.mem, "落地", finalProxy.loc, C.text),
              Row("server.rack", C.mem, "厂商", finalProxy.isp, C.text),
              Row(nativeIc, nativeCol, "属性", nativeText, C.text), 
              Row(riskIc, riskCol, "纯净", riskTxt, riskCol),
              Row("timer", C.mem, "延迟", proxyDelay, C.text), 
              Row("cpu", C.mem, "AI", textAI, C.text) 
          ]}
      ]},
      { type: 'spacer' }
    ]
  };
}
