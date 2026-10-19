// 金額の計算だけをまとめた関数。画面には触らない。
// rate は「1ドル = 何円か」。円のサブスクには関係しない。

const COLORS = [
  "#ff6b5b", // 赤
  "#ff9f1c", // 橙
  "#ffd23f", // 黄
  "#7cc644", // 黄緑
  "#22b59a", // 緑
  "#3fa7ff", // 水色
  "#4361ee", // 青
  "#8e5cf7", // 紫
  "#ff5fa2", // 桃
  "#24324f", // 紺
];

// 為替レートが取れなかったときの仮の値
const DEFAULT_RATE = 150;

function isUsd(sub) {
  return sub.currency === "usd";
}

// 1回の支払いを円にした金額
function yenOf(sub, rate) {
  return isUsd(sub) ? sub.price * rate : sub.price;
}

// 1か月あたりの金額(円。端数はそのまま。表示するときに丸める)
function monthlyOf(sub, rate) {
  return sub.cycle === "year" ? yenOf(sub, rate) / 12 : yenOf(sub, rate);
}

// 1年あたりの金額(円)
function yearlyOf(sub, rate) {
  return sub.cycle === "year" ? yenOf(sub, rate) : yenOf(sub, rate) * 12;
}

function totalsOf(subs, rate) {
  let month = 0;
  let year = 0;
  for (const sub of subs) {
    month += monthlyOf(sub, rate);
    year += yearlyOf(sub, rate);
  }
  return { month: Math.round(month), year: Math.round(year), count: subs.length };
}

// 毎月の合計に占める割合(0〜1)
function shareOf(sub, subs, rate) {
  let month = 0;
  for (const s of subs) month += monthlyOf(s, rate);
  return month > 0 ? monthlyOf(sub, rate) / month : 0;
}

// 1か月あたりが高い順。同じなら名前順
function sortSubs(subs, rate) {
  return subs.slice().sort((a, b) =>
    monthlyOf(b, rate) - monthlyOf(a, rate) || a.name.localeCompare(b.name, "ja"));
}

function formatYen(value) {
  return "¥" + Math.round(value).toLocaleString("ja-JP");
}

// ドルは、セントがあるときだけ小数2けたで出す($20 / $9.99)
function formatUsd(value) {
  const cents = Math.round(value * 100);
  const digits = cents % 100 === 0 ? 0 : 2;
  return "$" + (cents / 100).toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

// 支払う通貨のままの金額
function formatPrice(sub) {
  return isUsd(sub) ? formatUsd(sub.price) : formatYen(sub.price);
}

// 入力された金額を数にする。全角数字・カンマ・通貨記号も受けつける。読めなければ null
// 円は整数だけ、ドルは小数2けたまで
function parsePrice(text, currency) {
  const half = String(text)
    .replace(/[０-９．]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
    .replace(/[,，、\s¥￥円$＄ドル]/g, "");
  const pattern = currency === "usd" ? /^(\d+(\.\d{1,2})?|\.\d{1,2})$/ : /^\d+$/;
  if (!pattern.test(half)) return null;
  const value = Number(half);
  return value > 0 && value <= 10000000 ? value : null;
}

// 為替レートの入力(1ドル = 何円か)。読めなければ null
function parseRate(text) {
  const half = String(text)
    .replace(/[０-９．]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
    .replace(/[,，\s円]/g, "");
  if (!/^\d+(\.\d+)?$/.test(half)) return null;
  const value = Number(half);
  return value >= 1 && value <= 10000 ? value : null;
}

// まだ使っていない色を順に選ぶ。全部使っていたら件数で回す
function nextColor(subs) {
  const used = new Set(subs.map((s) => s.color));
  return COLORS.find((c) => !used.has(c)) || COLORS[subs.length % COLORS.length];
}

// 背景色の上に乗せる文字の色(明るい色には黒、暗い色には白)
function textColorOn(hex) {
  const n = parseInt(hex.slice(1), 16);
  const lin = (v) => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  const lum = 0.2126 * lin((n >> 16) & 255) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255);
  // 黒文字と白文字のコントラストが高い方
  return (lum + 0.05) / 0.05 > 1.05 / (lum + 0.05) ? "#1b1b1b" : "#ffffff";
}
