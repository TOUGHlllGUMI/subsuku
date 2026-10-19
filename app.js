(function () {
  const STORAGE_KEY = "subsuku.v1";
  const RATE_KEY = "subsuku.rate.v1";
  const RATE_URL = "https://api.frankfurter.dev/v1/latest?from=USD&to=JPY";
  // 自動のレートを取り直す間隔
  const RATE_MAX_AGE = 6 * 60 * 60 * 1000;

  const $ = (id) => document.getElementById(id);
  const els = {
    count: $("count"),
    totalMonth: $("totalMonth"),
    totalYear: $("totalYear"),
    bar: $("bar"),
    barNote: $("barNote"),
    rateButton: $("rateButton"),
    rateText: $("rateText"),
    empty: $("empty"),
    cards: $("cards"),
    add: $("addButton"),
    back: $("sheetBack"),
    sheet: $("sheet"),
    title: $("sheetTitle"),
    name: $("fName"),
    price: $("fPrice"),
    priceLabel: $("priceLabel"),
    priceMark: $("priceMark"),
    priceHint: $("priceHint"),
    presets: $("presets"),
    presetList: $("presetList"),
    presetNote: $("presetNote"),
    swatches: $("swatches"),
    error: $("formError"),
    del: $("deleteButton"),
    cancel: $("cancelButton"),
    rateBack: $("rateBack"),
    rateSheet: $("rateSheet"),
    rateAutoText: $("rateAutoText"),
    rateInput: $("fRate"),
    rateError: $("rateError"),
    rateAuto: $("rateAutoButton"),
    rateCancel: $("rateCancelButton"),
  };
  const cycleButtons = document.querySelectorAll("[data-cycle]");
  const currencyButtons = document.querySelectorAll("[data-currency]");

  let subs = load();
  // { auto: { value, date, fetchedAt } | null, manual: 数 | null }
  let rateState = loadRate();
  // 編集中の内容(null なら閉じている)
  let draft = null;

  // ---- 保存 ----
  function load() {
    try {
      const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      return Array.isArray(data)
        ? data
            .filter((s) => s && typeof s.name === "string" && s.price > 0)
            .map((s) => ({ ...s, currency: s.currency === "usd" ? "usd" : "jpy" }))
        : [];
    } catch (e) {
      return [];
    }
  }

  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(subs));
    } catch (e) {
      // 保存できない環境(プライベートモードなど)でも画面は動かす
    }
  }

  // ---- 為替レート ----
  function loadRate() {
    try {
      const data = JSON.parse(localStorage.getItem(RATE_KEY) || "null");
      if (data && typeof data === "object") {
        return {
          auto: data.auto && data.auto.value > 0 ? data.auto : null,
          manual: data.manual > 0 ? data.manual : null,
        };
      }
    } catch (e) {}
    return { auto: null, manual: null };
  }

  function saveRate() {
    try {
      localStorage.setItem(RATE_KEY, JSON.stringify(rateState));
    } catch (e) {}
  }

  function currentRate() {
    return rateState.manual || (rateState.auto && rateState.auto.value) || DEFAULT_RATE;
  }

  function hasUsd() {
    return subs.some(isUsd);
  }

  function formatRate(value) {
    return value.toLocaleString("ja-JP", { maximumFractionDigits: 2 });
  }

  function rateDescription() {
    if (rateState.manual) return "1ドル = " + formatRate(rateState.manual) + "円で計算(自分で設定)";
    if (rateState.auto) {
      const [, m, d] = rateState.auto.date.split("-").map(Number);
      return "1ドル = " + formatRate(rateState.auto.value) + "円で計算(" + m + "/" + d + "時点)";
    }
    return "1ドル = " + DEFAULT_RATE + "円で仮に計算(レートを取得できていません)";
  }

  // ドルのサブスクがあるときだけ、最新のレートを取りに行く(取りに行っている間は重ねない)
  let rateLoading = false;
  async function refreshRate() {
    if (!hasUsd() || rateLoading) return;
    const auto = rateState.auto;
    if (auto && Date.now() - auto.fetchedAt < RATE_MAX_AGE) return;
    rateLoading = true;
    try {
      const res = await fetch(RATE_URL);
      if (!res.ok) return;
      const data = await res.json();
      const value = data && data.rates && data.rates.JPY;
      if (!(value > 0)) return;
      rateState.auto = { value, date: String(data.date), fetchedAt: Date.now() };
      saveRate();
      render();
      if (!els.rateBack.hidden) renderRateSheet();
    } catch (e) {
      // オフラインなどで取れなければ、前回の値(なければ仮の値)のまま
    } finally {
      rateLoading = false;
    }
  }

  // ---- 一覧 ----
  function render() {
    const rate = currentRate();
    const totals = totalsOf(subs, rate);
    els.totalMonth.textContent = formatYen(totals.month);
    els.totalYear.textContent = formatYen(totals.year);
    els.count.textContent = totals.count ? totals.count + "件" : "";
    els.empty.hidden = subs.length > 0;
    els.bar.hidden = els.barNote.hidden = subs.length < 2;
    els.rateButton.hidden = !hasUsd();
    els.rateText.textContent = rateDescription();

    const sorted = sortSubs(subs, rate);

    els.bar.replaceChildren(...sorted.map((sub) => {
      const seg = document.createElement("span");
      seg.className = "bar-seg";
      seg.style.background = sub.color;
      seg.style.flexGrow = String(monthlyOf(sub, rate));
      return seg;
    }));

    els.cards.replaceChildren(...sorted.map((sub) => {
      const li = document.createElement("li");
      const card = document.createElement("button");
      card.type = "button";
      card.className = "card";
      card.style.backgroundColor = sub.color;
      card.addEventListener("click", () => openSheet(sub));

      const name = document.createElement("span");
      name.className = "card-name";
      name.textContent = sub.name;

      const share = document.createElement("span");
      share.className = "card-share";
      share.textContent = subs.length > 1 ? Math.round(shareOf(sub, subs, rate) * 100) + "%" : "";

      const price = document.createElement("span");
      price.className = "card-price";
      price.textContent = formatPrice(sub);
      const unit = document.createElement("small");
      unit.textContent = sub.cycle === "year" ? " / 年" : " / 月";
      price.append(unit);

      const sub2 = document.createElement("span");
      sub2.className = "card-sub";
      sub2.textContent = subText(sub, rate);

      const head = document.createElement("span");
      head.className = "card-head";
      head.append(name, share);
      card.append(head, price, sub2);
      li.append(card);
      return li;
    }));
  }

  // カードの下の小さい行
  function subText(sub, rate) {
    if (isUsd(sub)) return "円で約 " + formatYen(monthlyOf(sub, rate)) + " / 月";
    return sub.cycle === "year"
      ? "月あたり " + formatYen(monthlyOf(sub, rate))
      : "1年で " + formatYen(yearlyOf(sub, rate));
  }

  // ---- 追加・編集のシート ----
  function openSheet(sub) {
    draft = sub
      ? { ...sub }
      : { id: null, name: "", price: 0, cycle: "month", currency: "jpy", color: nextColor(subs) };
    els.title.textContent = sub ? "サブスクを編集" : "サブスクを追加";
    els.name.value = draft.name;
    els.price.value = draft.price ? String(draft.price) : "";
    els.del.hidden = !sub;
    els.error.hidden = true;
    renderSheet();
    els.back.hidden = false;
    document.body.classList.add("locked");
    // スマホで勝手にキーボードが出ないよう、新規のときだけ名前に入る
    if (!sub) setTimeout(() => els.name.focus(), 50);
  }

  function closeSheet() {
    draft = null;
    els.back.hidden = true;
    document.body.classList.remove("locked");
    els.add.focus({ preventScroll: true });
  }

  function setPressed(buttons, isOn) {
    buttons.forEach((btn) => {
      const on = isOn(btn);
      btn.classList.toggle("on", on);
      btn.setAttribute("aria-checked", on ? "true" : "false");
    });
  }

  function renderSheet() {
    setPressed(cycleButtons, (btn) => btn.dataset.cycle === draft.cycle);
    setPressed(currencyButtons, (btn) => btn.dataset.currency === draft.currency);
    els.priceLabel.textContent = draft.cycle === "year" ? "1年の金額" : "1か月の金額";
    els.priceMark.textContent = draft.currency === "usd" ? "$" : "¥";
    els.price.inputMode = draft.currency === "usd" ? "decimal" : "numeric";
    els.price.placeholder = draft.currency === "usd" ? "0.00" : "0";
    updateHint();
    renderPresets();

    els.swatches.replaceChildren(...COLORS.map((color) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "swatch" + (color === draft.color ? " on" : "");
      b.style.background = color;
      b.style.color = textColorOn(color);
      b.setAttribute("aria-label", "色 " + (COLORS.indexOf(color) + 1));
      b.setAttribute("aria-pressed", color === draft.color ? "true" : "false");
      b.addEventListener("click", () => {
        draft.color = color;
        renderSheet();
      });
      return b;
    }));
  }

  // 名前に合うサービスがあれば、プランの候補を出す。押すと金額などが入る
  function renderPresets() {
    const found = findPresets(els.name.value).slice(0, 12);
    els.presets.hidden = found.length === 0;
    if (!found.length) return;
    const price = parsePrice(els.price.value, draft.currency);
    // 1つのサービスだけなら、行ごとにサービス名をくり返さない
    const oneService = new Set(found.map((p) => p.name)).size === 1;

    els.presetList.replaceChildren(...found.map((p) => {
      const b = document.createElement("button");
      b.type = "button";
      const on = p.price === price && p.cycle === draft.cycle && p.currency === draft.currency
        && els.name.value.trim() === p.name;
      b.className = "preset" + (on ? " on" : "");
      b.setAttribute("aria-pressed", on ? "true" : "false");

      const title = document.createElement("span");
      title.className = "preset-name";
      title.textContent = !p.label ? p.name : oneService ? p.label : p.name + " " + p.label;
      const amount = document.createElement("span");
      amount.className = "preset-price";
      amount.textContent = (p.currency === "usd" ? formatUsd(p.price) : formatYen(p.price))
        + (p.cycle === "year" ? " / 年" : " / 月");
      b.append(title, amount);

      b.addEventListener("click", () => {
        els.name.value = p.name;
        els.price.value = String(p.price);
        draft.cycle = p.cycle;
        draft.currency = p.currency;
        els.error.hidden = true;
        renderSheet();
      });
      return b;
    }));
    els.presetNote.textContent = "金額は" + PRESETS_DATE + "時点の目安です。払い方で違うときは直してください";
  }

  function updateHint() {
    const price = parsePrice(els.price.value, draft.currency);
    if (!price) {
      els.priceHint.textContent = "";
      return;
    }
    const rate = currentRate();
    const sub = { price, cycle: draft.cycle, currency: draft.currency };
    if (isUsd(sub)) {
      els.priceHint.textContent = "約 " + formatYen(yenOf(sub, rate)) + "(" + (draft.cycle === "year"
        ? "月あたり約 " + formatYen(monthlyOf(sub, rate))
        : "1年で約 " + formatYen(yearlyOf(sub, rate))) + ")";
    } else {
      els.priceHint.textContent = draft.cycle === "year"
        ? "月あたり " + formatYen(monthlyOf(sub, rate))
        : "1年で " + formatYen(yearlyOf(sub, rate));
    }
  }

  function showError(el, text, field) {
    el.textContent = text;
    el.hidden = false;
    field.focus();
  }

  function submit() {
    const name = els.name.value.trim();
    const price = parsePrice(els.price.value, draft.currency);
    if (!name) return showError(els.error, "名前を入れてください", els.name);
    if (!price) {
      return showError(els.error, draft.currency === "usd"
        ? "金額を数字で入れてください(セントは小数2けたまで)"
        : "金額を数字で入れてください", els.price);
    }

    const item = { ...draft, name, price };
    if (item.id) {
      subs = subs.map((s) => (s.id === item.id ? item : s));
    } else {
      item.id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
      subs = subs.concat(item);
    }
    save();
    render();
    closeSheet();
    refreshRate();
  }

  function remove() {
    if (!draft || !draft.id) return;
    if (!confirm("「" + draft.name + "」を削除しますか?")) return;
    subs = subs.filter((s) => s.id !== draft.id);
    save();
    render();
    closeSheet();
  }

  // ---- レートのシート ----
  function openRateSheet() {
    els.rateError.hidden = true;
    els.rateInput.value = formatRate(currentRate()).replace(/,/g, "");
    renderRateSheet();
    els.rateBack.hidden = false;
    document.body.classList.add("locked");
    refreshRate();
  }

  function renderRateSheet() {
    els.rateAutoText.textContent = rateState.auto
      ? "自動では、最新のレート(1ドル = " + formatRate(rateState.auto.value) + "円)で計算します。"
      : "自動のレートをまだ取得できていません。インターネットにつながると取得します。";
    els.rateAuto.hidden = !rateState.manual;
  }

  function closeRateSheet() {
    els.rateBack.hidden = true;
    document.body.classList.remove("locked");
  }

  function submitRate() {
    const value = parseRate(els.rateInput.value);
    if (!value) return showError(els.rateError, "1〜10000の数字で入れてください", els.rateInput);
    // 自動の値と同じなら、自分で決めたことにしない
    rateState.manual = rateState.auto && value === rateState.auto.value ? null : value;
    saveRate();
    render();
    closeRateSheet();
  }

  function useAutoRate() {
    rateState.manual = null;
    saveRate();
    render();
    closeRateSheet();
    refreshRate();
  }

  // ---- 操作 ----
  els.add.addEventListener("click", () => openSheet(null));
  els.cancel.addEventListener("click", closeSheet);
  els.del.addEventListener("click", remove);
  els.sheet.addEventListener("submit", (e) => {
    e.preventDefault();
    submit();
  });
  els.back.addEventListener("click", (e) => {
    if (e.target === els.back) closeSheet();
  });
  cycleButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      draft.cycle = btn.dataset.cycle;
      renderSheet();
    });
  });
  currencyButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      draft.currency = btn.dataset.currency;
      renderSheet();
    });
  });
  els.price.addEventListener("input", () => {
    updateHint();
    renderPresets();
  });
  els.name.addEventListener("input", renderPresets);

  els.rateButton.addEventListener("click", openRateSheet);
  els.rateCancel.addEventListener("click", closeRateSheet);
  els.rateAuto.addEventListener("click", useAutoRate);
  els.rateSheet.addEventListener("submit", (e) => {
    e.preventDefault();
    submitRate();
  });
  els.rateBack.addEventListener("click", (e) => {
    if (e.target === els.rateBack) closeRateSheet();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    if (!els.rateBack.hidden) closeRateSheet();
    else if (draft) closeSheet();
  });

  // 他のタブで変えたときも合わせる
  window.addEventListener("storage", (e) => {
    if (e.key === STORAGE_KEY) subs = load();
    else if (e.key === RATE_KEY) rateState = loadRate();
    else return;
    render();
  });

  render();
  refreshRate();

  if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  }
})();
