// よく使われるサブスクの料金(2026年10月時点で調べた日本の税込価格)。
// 値上げがあったらここを直す。aliases は名前の入力で候補を出すための別の呼び方。
// iPhoneのアプリ内で払うと高くなるサービスもあるので、あくまで目安。

const PRESETS_DATE = "2026年10月";

const PRESETS = [
  {
    name: "Netflix",
    aliases: ["ネットフリックス", "ネトフリ"],
    plans: [
      { label: "広告つきスタンダード", price: 890, cycle: "month" },
      { label: "スタンダード", price: 1590, cycle: "month" },
      { label: "プレミアム", price: 2290, cycle: "month" },
    ],
  },
  {
    name: "YouTube Premium",
    aliases: ["ユーチューブ", "ようつべ", "youtube"],
    plans: [
      { label: "個人", price: 1280, cycle: "month" },
      { label: "個人(年払い)", price: 12800, cycle: "year" },
      { label: "ファミリー", price: 2280, cycle: "month" },
      { label: "学生", price: 780, cycle: "month" },
      { label: "Lite", price: 780, cycle: "month" },
    ],
  },
  {
    name: "Amazonプライム",
    aliases: ["amazon", "アマゾン", "アマプラ", "prime", "プライム"],
    plans: [
      { label: "月払い", price: 600, cycle: "month" },
      { label: "年払い", price: 5900, cycle: "year" },
      { label: "学生(月払い)", price: 300, cycle: "month" },
      { label: "学生(年払い)", price: 2950, cycle: "year" },
    ],
  },
  {
    name: "Amazon Music Unlimited",
    aliases: ["アマゾンミュージック", "amazon music"],
    plans: [
      { label: "プライム会員", price: 1080, cycle: "month" },
      { label: "プライム会員以外", price: 1180, cycle: "month" },
    ],
  },
  {
    name: "Kindle Unlimited",
    aliases: ["キンドル", "kindle"],
    plans: [{ label: "", price: 980, cycle: "month" }],
  },
  {
    name: "Spotify",
    aliases: ["スポティファイ", "スポティ"],
    plans: [
      { label: "Standard", price: 1080, cycle: "month" },
      { label: "Duo", price: 1480, cycle: "month" },
      { label: "Family", price: 1880, cycle: "month" },
      { label: "Student", price: 580, cycle: "month" },
    ],
  },
  {
    name: "Apple Music",
    aliases: ["アップルミュージック"],
    plans: [
      { label: "個人", price: 1180, cycle: "month" },
      { label: "ファミリー", price: 1980, cycle: "month" },
      { label: "学生", price: 680, cycle: "month" },
    ],
  },
  {
    name: "iCloud+",
    aliases: ["icloud", "アイクラウド"],
    plans: [
      { label: "50GB", price: 180, cycle: "month" },
      { label: "200GB", price: 540, cycle: "month" },
      { label: "2TB", price: 1800, cycle: "month" },
    ],
  },
  {
    name: "Apple One",
    aliases: ["アップルワン"],
    plans: [
      { label: "個人", price: 1350, cycle: "month" },
      { label: "ファミリー", price: 2500, cycle: "month" },
    ],
  },
  {
    name: "Apple TV",
    aliases: ["アップルtv", "apple tv+"],
    plans: [{ label: "", price: 1200, cycle: "month" }],
  },
  {
    name: "ディズニープラス",
    aliases: ["disney+", "disney plus", "disney", "ディズニー"],
    plans: [
      { label: "スタンダード", price: 1250, cycle: "month" },
      { label: "スタンダード(年払い)", price: 12500, cycle: "year" },
      { label: "プレミアム", price: 1670, cycle: "month" },
      { label: "プレミアム(年払い)", price: 16700, cycle: "year" },
    ],
  },
  {
    name: "U-NEXT",
    aliases: ["ユーネクスト", "unext"],
    plans: [{ label: "", price: 2189, cycle: "month" }],
  },
  {
    name: "Hulu",
    aliases: ["フールー"],
    plans: [{ label: "", price: 1320, cycle: "month" }],
  },
  {
    name: "DAZN",
    aliases: ["ダゾーン"],
    plans: [{ label: "Standard", price: 4200, cycle: "month" }],
  },
  {
    name: "Nintendo Switch Online",
    aliases: ["ニンテンドースイッチオンライン", "スイッチオンライン", "任天堂", "switch"],
    plans: [
      { label: "個人 1か月", price: 400, cycle: "month" },
      { label: "個人 12か月", price: 3000, cycle: "year" },
      { label: "ファミリー 12か月", price: 5800, cycle: "year" },
      { label: "追加パック 個人 12か月", price: 5900, cycle: "year" },
    ],
  },
  {
    name: "ChatGPT Plus",
    aliases: ["chatgpt", "チャットgpt", "openai"],
    plans: [{ label: "", price: 20, cycle: "month", currency: "usd" }],
  },
  {
    name: "Claude",
    aliases: ["クロード", "anthropic"],
    plans: [
      { label: "Pro", price: 20, cycle: "month", currency: "usd" },
      { label: "Max 5x", price: 100, cycle: "month", currency: "usd" },
      { label: "Max 20x", price: 200, cycle: "month", currency: "usd" },
    ],
  },
  {
    name: "Google AI",
    aliases: ["gemini", "ジェミニ", "google one", "グーグル"],
    plans: [
      { label: "AI Plus", price: 1200, cycle: "month" },
      { label: "AI Pro", price: 2900, cycle: "month" },
    ],
  },
];

// 比べるために文字をそろえる(全角→半角、大文字→小文字、カタカナ→ひらがな、記号や空白を消す)
function normalizeForSearch(text) {
  return String(text)
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60))
    .replace(/[\s・\-+_.()]/g, "");
}

// 入力に合うサービスのプランを並べて返す。何も入っていなければ空
function findPresets(query) {
  const q = normalizeForSearch(query);
  if (!q) return [];
  const results = [];
  for (const preset of PRESETS) {
    const words = [preset.name, ...preset.aliases].map(normalizeForSearch);
    const hit = words.some((w) => w.includes(q) || (q.length >= 3 && q.includes(w)));
    if (!hit) continue;
    for (const plan of preset.plans) {
      results.push({
        name: preset.name,
        label: plan.label,
        price: plan.price,
        cycle: plan.cycle,
        currency: plan.currency || "jpy",
      });
    }
  }
  return results;
}
