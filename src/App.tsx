import { demoFetch as fetch, resetDemo } from "./demo-store";

import { FormEvent, useEffect, useMemo, useState } from "react";

type Person = "Deniz" | "Ege" | "Ortak";
type Kind = "income" | "expense";
type Transaction = { id: number; person: Person; kind: Kind; amount: number; category: string; note: string; date: string };
type CardPerson = "Deniz" | "Ege";
type CreditCard = { id: number; person: CardPerson; statementDay: number };
type CardExpense = { id: number; person: CardPerson; amount: number; note: string; category: string; date: string };
type CardPayment = { id: number; person: CardPerson; amount: number; note: string; date: string };

const expenseCategories = ["Market", "Kira", "Faturalar", "Ulaşım", "Sigara", "Yeme & içme", "Sosyal yaşam", "Giyim", "Sağlık", "Ev ihtiyaçları", "Kişisel bakım", "Eğitim", "Abonelikler", "Borç / kredi", "Hediye", "Tatil", "Evcil hayvan", "Diğer"];
const incomeCategories = ["Maaş", "Ek gelir", "Prim", "Serbest iş", "Kira geliri", "Yatırım getirisi", "İade", "Diğer"];
const expenseColors = ["#657c6c", "#9a806c", "#a9b8a3", "#52736d", "#c1a78d"];
const money = new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 2 });
const today = () => new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Istanbul" });

export default function Home() {
  const [items, setItems] = useState<Transaction[]>([]);
  const [filter, setFilter] = useState<"Tümü" | Person>("Tümü");
  const [month, setMonth] = useState(today().slice(0, 7));
  const [view, setView] = useState<"budget" | "debts">("budget");
  const [cards, setCards] = useState<CreditCard[]>([]);
  const [cardExpenses, setCardExpenses] = useState<CardExpense[]>([]);
  const [cardPayments, setCardPayments] = useState<CardPayment[]>([]);
  const [modal, setModal] = useState(false);
  const [kind, setKind] = useState<Kind>("expense");
  const [syncState, setSyncState] = useState<"loading" | "ready" | "error">("loading");
  const [pin, setPin] = useState("");
  const [unlocked, setUnlocked] = useState(true);
  const [pinError, setPinError] = useState("");

  useEffect(() => {
    unlock("demo");
  }, []);
  useEffect(() => { if (unlocked) refreshTransactions(month); }, [month]);
  useEffect(() => {
    function closeOnEscape(event: KeyboardEvent) { if (event.key === "Escape") setModal(false); }
    window.addEventListener("keydown", closeOnEscape); return () => window.removeEventListener("keydown", closeOnEscape);
  }, []);
  const visible = useMemo(() => items.filter((x) => x.date.startsWith(month) && (filter === "Tümü" || x.person === filter)), [items, month, filter]);
  const income = visible.filter((x) => x.kind === "income").reduce((s, x) => s + x.amount, 0);
  const expense = visible.filter((x) => x.kind === "expense").reduce((s, x) => s + x.amount, 0);
  const balance = income - expense;
  const categoryData = useMemo(() => { const grouped: Record<string, number> = {}; visible.filter((x) => x.kind === "expense").forEach((x) => grouped[x.category] = (grouped[x.category] || 0) + x.amount); return Object.entries(grouped).sort((a, b) => b[1] - a[1]).slice(0, 5); }, [visible]);
  const totalCat = categoryData.reduce((s, x) => s + x[1], 0) || 1;
  let angle = 0;
  const pie = categoryData.map(([, val], i) => { const start = angle; angle += (val / totalCat) * 360; return `${expenseColors[i]} ${start}deg ${angle}deg`; }).join(", ");

  async function unlock(pinAttempt: string) {
    setSyncState("loading"); setPinError("");
    try {
      const response = await fetch(`/api/transactions?month=${month}`, { headers: { "x-household-pin": pinAttempt } });
      if (!response.ok) throw new Error("PIN hatalı");
      const data = await response.json() as { transactions: Transaction[] };
      setItems(data.transactions); setPin(pinAttempt); setUnlocked(true); setSyncState("ready");  await refreshCards(pinAttempt);
    } catch { setPinError("Tarayıcı depolamasına erişilemiyor."); setSyncState("error");  }
  }

  async function refreshTransactions(targetMonth: string) {
    try { const response = await fetch(`/api/transactions?month=${targetMonth}`, { headers: { "x-household-pin": pin } }); if (response.ok) setItems(((await response.json()) as { transactions: Transaction[] }).transactions); } catch { setSyncState("error"); }
  }

  async function refreshCards(pinValue = pin) {
    const response = await fetch("/api/cards", { headers: { "x-household-pin": pinValue } });
    if (!response.ok) throw new Error("Kart bilgileri alınamadı");
    const data = await response.json() as { cards: CreditCard[]; expenses: CardExpense[]; payments: CardPayment[] };
    setCards(data.cards); setCardExpenses(data.expenses); setCardPayments(data.payments);
  }

  async function addTransaction(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); const data = new FormData(e.currentTarget);
    const payload = { person: data.get("person") as Person, kind, amount: Number(data.get("amount")), category: String(data.get("category")), note: String(data.get("note")), date: String(data.get("date")), recurring: data.get("recurring") === "on" };
    setSyncState("loading");
    try {
      const response = await fetch("/api/transactions", { method: "POST", headers: { "Content-Type": "application/json", "x-household-pin": pin }, body: JSON.stringify(payload) });
      if (!response.ok) throw new Error("İşlem kaydedilemedi");
      const result = await response.json() as { transaction: Transaction };
      setItems((current) => [result.transaction, ...current]); setSyncState("ready"); setModal(false);
    } catch { setSyncState("error"); }
  }

  async function cardAction(event: FormEvent<HTMLFormElement>, action: "expense" | "payment", person: CardPerson) {
    event.preventDefault(); const form = event.currentTarget; const data = new FormData(form);
    setSyncState("loading");
    try {
      const response = await fetch("/api/cards", { method: "POST", headers: { "Content-Type": "application/json", "x-household-pin": pin }, body: JSON.stringify({ action, person, amount: Number(data.get("amount")), note: String(data.get("note") ?? ""), category: String(data.get("category") ?? "Diğer"), date: String(data.get("date")) }) });
      if (!response.ok) throw new Error(); await refreshCards(); form.reset(); setSyncState("ready");
    } catch { setSyncState("error"); }
  }

  async function updateStatementDay(person: CardPerson, day: number) {
    setSyncState("loading");
    try { const response = await fetch("/api/cards", { method: "POST", headers: { "Content-Type": "application/json", "x-household-pin": pin }, body: JSON.stringify({ action: "statementDay", person, day }) }); if (!response.ok) throw new Error(); await refreshCards(); setSyncState("ready"); } catch { setSyncState("error"); }
  }

  async function deleteTransaction(id: number) {
    setSyncState("loading");
    try {
      const response = await fetch(`/api/transactions?id=${id}`, { method: "DELETE", headers: { "x-household-pin": pin } });
      if (!response.ok) throw new Error("İşlem silinemedi");
      setItems((current) => current.filter((item) => item.id !== id)); setSyncState("ready");
    } catch { setSyncState("error"); }
  }


  return <main>
    <aside className="demo-banner"><span><b>Portföy demosu</b> · Boş başlar. Deneme kayıtları yalnızca bu tarayıcıda saklanır.</span><button onClick={() => { if (window.confirm("Bu tarayıcıdaki tüm demo kayıtları silinsin mi?")) { resetDemo(); window.location.reload(); } }}>Demoyu sıfırla</button></aside>
    {pinError && <p role="alert" className="empty-state">{pinError}</p>}
    <header className="topbar"><button className="brand" onClick={() => setView("budget")}><span className="brandmark">₺</span><span>Ortak<br/><b>Kasa</b></span></button><nav aria-label="Ana menü"><button className={view === "budget" ? "active" : ""} onClick={() => setView("budget")}>Gelir Gider</button><button className={view === "debts" ? "active" : ""} onClick={() => setView("debts")}>Borçlar</button></nav><div className="header-users"><span className={`sync ${syncState}`}>{syncState === "loading" ? "Kaydediliyor…" : syncState === "error" ? "Kayıt tamamlanamadı" : "Bu tarayıcıya kaydedildi"}</span><div className="avatar-stack" aria-label="Kullanıcılar"><span className="avatar deniz">D</span><span className="avatar ege">E</span></div></div></header>
    {view === "budget" ? <>
    <section className="hero" id="ozet"><div><p className="eyebrow">GELİR GİDER · AYLIK ÖZET</p><h1>Paranız nereye gidiyor,<br/><em>birlikte görün.</em></h1><p className="intro">İki kişi, tek bakış. Gelirlerinizi ve harcamalarınızı ayrı ayrı ya da toplam olarak kolayca takip edin.</p></div><button className="add" onClick={() => setModal(true)}><span>＋</span> Yeni harcama</button></section>
    <section className="controls" aria-label="Filtreler"><div className="segmented">{(["Tümü", "Deniz", "Ege", "Ortak"] as const).map((x) => <button key={x} className={filter === x ? "selected" : ""} onClick={() => setFilter(x)}>{x === "Tümü" ? "Birlikte" : x}</button>)}</div><label className="month">Ay seçin <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} /></label></section>
    <section className="summary-grid"><article className="balance-card"><p>NET DURUM</p><strong>{money.format(balance)}</strong><span className={balance >= 0 ? "positive" : "negative"}>{balance >= 0 ? "↑ Güzel gidiyor" : "↓ Dikkat"}</span><div className="motif" aria-hidden="true">↗</div></article><article className="metric"><span className="metric-icon income">↙</span><div><p>TOPLAM GELİR</p><strong>{money.format(income)}</strong><small>Bu ay eklenen</small></div></article><article className="metric"><span className="metric-icon expense">↗</span><div><p>TOPLAM GİDER</p><strong>{money.format(expense)}</strong><small>Gelirin %{income ? Math.round(expense / income * 100) : 0}&apos;i</small></div></article></section>
    <section className="content-grid"><article className="panel" id="dagilim"><div className="panel-head"><div><p className="eyebrow">HARCAMA ANALİZİ</p><h2>Kategorilere göre</h2></div><span className="badge">{visible.filter(x => x.kind === "expense").length} işlem</span></div><div className="chart-wrap"><div className="donut" style={{ background: categoryData.length ? `conic-gradient(${pie})` : "#eee7dc" }}><div><small>Toplam</small><b>{money.format(expense)}</b></div></div><div className="legend">{categoryData.length ? categoryData.map(([cat, val], i) => <div className="legend-row" key={cat}><i style={{background: expenseColors[i]}}/><span>{cat}</span><b>{money.format(val)}</b><small>%{Math.round(val / totalCat * 100)}</small></div>) : <p className="empty">Bu ay henüz gider yok.</p>}</div></div></article>
    <article className="panel" id="islemler"><div className="panel-head"><div><p className="eyebrow">SON HAREKETLER</p><h2>İşlemler</h2></div><button className="text-button" onClick={() => setModal(true)}>Yeni harcama →</button></div><div className="transactions">{visible.length ? visible.slice(0, 6).map((x) => <div className="transaction" key={x.id}><span className={`avatar ${x.person.toLowerCase()}`}>{x.person === "Ortak" ? "↔" : x.person[0]}</span><div><b>{x.note || x.category}</b><small>{x.person} · {x.category} · {new Date(`${x.date}T12:00:00`).toLocaleDateString("tr-TR", { day: "numeric", month: "short" })}</small></div><strong className={x.kind}>{x.kind === "expense" ? "−" : "+"}{money.format(x.amount).replace("₺", "").trim()} ₺</strong><button className="delete" aria-label={`${x.note || x.category} işlemini sil`} onClick={() => deleteTransaction(x.id)}>×</button></div>) : <p className="empty-state">Bu ay için henüz işlem yok. İlk harcamanızı ekleyerek başlayın.</p>}</div></article></section>
    <section className="people">{(["Deniz", "Ege", "Ortak"] as Person[]).map((person) => { const pItems = items.filter(x => x.person === person && x.date.startsWith(month)); const inc = pItems.filter(x => x.kind === "income").reduce((s,x) => s+x.amount,0); const exp = pItems.filter(x => x.kind === "expense").reduce((s,x) => s+x.amount,0); return <article key={person}><span className={`avatar big ${person.toLowerCase()}`}>{person === "Ortak" ? "↔" : person[0]}</span><div><p>{person === "Ortak" ? "Ortak işlemler" : `${person}'in özeti`}</p><b>{money.format(inc-exp)}</b></div><div className="mini"><span>Gelir <b>{money.format(inc)}</b></span><span>Gider <b>{money.format(exp)}</b></span></div></article> })}</section>
    </> : <DebtsView cards={cards} expenses={cardExpenses} payments={cardPayments} onExpense={(e,p) => cardAction(e,"expense",p)} onPayment={(e,p) => cardAction(e,"payment",p)} onStatementDay={updateStatementDay} />}
    {modal && <div className="modal-backdrop" onMouseDown={() => setModal(false)}><div className="modal" role="dialog" aria-modal="true" aria-labelledby="form-title" onMouseDown={(e) => e.stopPropagation()}><button className="close" aria-label="Kapat" onClick={() => setModal(false)}>×</button><p className="eyebrow">YENİ KAYIT</p><h2 id="form-title">İşlem ekle</h2><p className="modal-copy">İşlemin kime ait olduğunu seçin; birlikte yapılanları “Ortak” olarak kaydedin.</p><div className="kind-tabs"><button type="button" className={kind === "expense" ? "chosen" : ""} onClick={() => setKind("expense")}>Gider</button><button type="button" className={kind === "income" ? "chosen" : ""} onClick={() => setKind("income")}>Gelir</button></div><form onSubmit={addTransaction}><label>Kimin işlemi?<select name="person"><option>Deniz</option><option>Ege</option><option>Ortak</option></select></label><label>Tutar<input name="amount" type="number" min="0.01" step="0.01" inputMode="decimal" placeholder="0 ₺" required autoFocus /></label><label>Kategori<select name="category">{(kind === "expense" ? expenseCategories : incomeCategories).map(c => <option key={c}>{c}</option>)}</select></label><label>Tarih<input name="date" type="date" defaultValue={today().startsWith(month) ? today() : `${month}-01`} required /></label><label className="full">Not <small>isteğe bağlı</small><input name="note" maxLength={80} placeholder="Örn. haftalık market" /></label>{kind === "expense" && <label className="recurring-check full"><input name="recurring" type="checkbox"/><span><b>Her ay otomatik ekle</b><small>Abonelik, kira ve sabit faturalar için</small></span></label>}<button className="submit" type="submit">İşlemi kaydet</button></form></div></div>}
  </main>;
}

function DebtsView({ cards, expenses, payments, onExpense, onPayment, onStatementDay }: {
  cards: CreditCard[]; expenses: CardExpense[]; payments: CardPayment[];
  onExpense: (event: FormEvent<HTMLFormElement>, person: CardPerson) => void;
  onPayment: (event: FormEvent<HTMLFormElement>, person: CardPerson) => void;
  onStatementDay: (person: CardPerson, day: number) => void;
}) {
  const people: CardPerson[] = ["Deniz", "Ege"];
  const totalDebt = people.reduce((sum, person) => sum + Math.max(0, expenses.filter(x => x.person === person).reduce((s,x) => s+x.amount,0) - payments.filter(x => x.person === person).reduce((s,x) => s+x.amount,0)), 0);
  return <>
    <section className="debt-hero"><div><p className="eyebrow">KREDİ KARTI MERKEZİ</p><h1>Borcu saklamayın,<br/><em>kontrol altında tutun.</em></h1><p className="intro">Kart harcamaları bütçeden bağımsızdır. Yaptığınız ödemeler borçtan düşer, yalnızca kalan tutar burada görünür.</p></div><article className="total-debt"><span>TOPLAM KALAN BORÇ</span><strong>{money.format(totalDebt)}</strong><small>Deniz + Ege</small></article></section>
    <section className="debt-grid">{people.map(person => {
      const card = cards.find(x => x.person === person);
      const pExpenses = expenses.filter(x => x.person === person);
      const pPayments = payments.filter(x => x.person === person);
      const spent = pExpenses.reduce((s,x) => s+x.amount,0); const paid = pPayments.reduce((s,x) => s+x.amount,0); const remaining = Math.max(0, spent-paid);
      const statementDay = card?.statementDay ?? 15;
      const currentStatement = pExpenses.filter(x => Number(x.date.slice(8,10)) <= statementDay).reduce((s,x) => s+x.amount,0);
      return <article className={`card-account ${person.toLowerCase()}`} key={person}>
        <div className="card-visual"><div className="card-top"><span>{person}</span><i className="card-brand" aria-hidden="true"><b></b><b></b></i></div><strong>{money.format(remaining)}</strong><small>KALAN KART BORCU</small><div className="card-bottom"><span>•••• {person === "Deniz" ? "0001" : "0002"}</span><label>Ekstre günü <select value={statementDay} onChange={e => onStatementDay(person, Number(e.target.value))}>{Array.from({length:28},(_,i)=><option key={i+1} value={i+1}>{i+1}</option>)}</select></label></div></div>
        <div className="debt-metrics"><div><span>Toplam harcama</span><b>{money.format(spent)}</b></div><div><span>Ödenen</span><b className="paid">{money.format(Math.min(paid,spent))}</b></div><div><span>Kesilmiş ekstre</span><b>{money.format(Math.max(0,currentStatement-paid))}</b></div></div>
        <div className="card-forms"><form onSubmit={e => onExpense(e,person)}><h3>Kart harcaması ekle</h3><label>Açıklama<input name="note" placeholder="Örn. market alışverişi" maxLength={80} required/></label><div><label>Tutar<input name="amount" type="number" min="0.01" step="0.01" placeholder="0 ₺" required/></label><label>Tarih<input name="date" type="date" defaultValue={today()} required/></label></div><label>Kategori<select name="category">{expenseCategories.map(c=><option key={c}>{c}</option>)}</select></label><button className="submit" type="submit">Harcamayı kaydet</button></form>
        <form className="payment-form" onSubmit={e => onPayment(e,person)}><h3>Borç ödemesi</h3><p>Ödediğiniz tutar kalan borçtan anında düşer.</p><div><label>Ödenen tutar<input name="amount" type="number" min="0.01" step="0.01" max={remaining || undefined} placeholder="0 ₺" required/></label><label>Ödeme tarihi<input name="date" type="date" defaultValue={today()} required/></label></div><input name="note" type="hidden" value="Kart borcu ödemesi"/><button className="pay-button" type="submit" disabled={remaining <= 0}>Ödemeyi borçtan düş</button></form></div>
        <div className="card-history"><h3>Son kart hareketleri</h3>{pExpenses.length || pPayments.length ? [...pExpenses.map(x=>({...x,type:"expense" as const})),...pPayments.map(x=>({...x,category:"Ödeme",type:"payment" as const}))].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,6).map(x=><div className="card-row" key={`${x.type}-${x.id}`}><span className={x.type}>{x.type === "expense" ? "↗" : "✓"}</span><div><b>{x.note}</b><small>{x.category} · {new Date(`${x.date}T12:00:00`).toLocaleDateString("tr-TR",{day:"numeric",month:"short"})}</small></div><strong className={x.type}>{x.type === "expense" ? "−" : "+"}{money.format(x.amount)}</strong></div>) : <p className="empty-state">Henüz kredi kartı hareketi yok.</p>}</div>
      </article>
    })}</section>
  </>;
}
