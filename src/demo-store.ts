type Row = Record<string, any>;
type Store = { nextId: number; transactions: Row[]; recurring: Row[]; cards: Row[]; expenses: Row[]; payments: Row[] };
const KEY = 'ortak-kasa-portfolio-v1';
const empty = (): Store => ({ nextId: 1, transactions: [], recurring: [], cards: [{ id: 1, person: 'Deniz', statementDay: 15 }, { id: 2, person: 'Ege', statementDay: 15 }], expenses: [], payments: [] });
const load = (): Store => { const raw = localStorage.getItem(KEY); return raw ? JSON.parse(raw) : empty(); };
export function resetDemo() { localStorage.removeItem(KEY); }
// This adapter has no network access and never reads the original site's records.
export async function demoFetch(input: string, init: RequestInit = {}): Promise<Response> {
  try {
    const url = new URL(input, 'https://demo.local');
    const db = load();
    const method = init.method ?? 'GET';
    const body: Row = init.body ? JSON.parse(String(init.body)) : {};
    const reply = (data: unknown, status = 200) => Response.json(data, { status });
    const save = () => localStorage.setItem(KEY, JSON.stringify(db));
    const add = (row: Row): Row => ({ ...row, id: db.nextId++, createdAt: new Date().toISOString() });
    if (url.pathname === '/api/transactions') {
      if (method === 'GET') {
        const month = url.searchParams.get('month') ?? '';
        if (/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
          for (const t of db.recurring.filter(x => x.startMonth <= month)) {
            if (!db.transactions.some(x => x.recurringId === t.id && x.occurrenceMonth === month)) {
              const [year, m] = month.split('-').map(Number);
              const day = Math.min(t.dayOfMonth, new Date(year, m, 0).getDate());
              db.transactions.push(add({ person: t.person, kind: 'expense', amount: t.amount, category: t.category, note: t.note, date: `${month}-${String(day).padStart(2,'0')}`, recurringId: t.id, occurrenceMonth: month }));
            }
          }
          save();
        }
        return reply({ transactions: [...db.transactions].sort((a,b) => b.date.localeCompare(a.date) || b.id-a.id) });
      }
      if (method === 'POST') {
        if (!['Deniz','Ege','Ortak'].includes(body.person) || !['income','expense'].includes(body.kind) || !Number.isFinite(body.amount) || body.amount <= 0 || !body.category || !/^\d{4}-\d{2}-\d{2}$/.test(body.date)) return reply({ error:'Geçersiz işlem' },400);
        const transaction = add({ person:body.person, kind:body.kind, amount:body.amount, category:body.category, note:String(body.note ?? '').slice(0,80), date:body.date });
        if (body.recurring && body.kind === 'expense') {
          const template = add({ ...transaction, startMonth:body.date.slice(0,7), dayOfMonth:Number(body.date.slice(8,10)) });
          db.recurring.push(template); transaction.recurringId = template.id; transaction.occurrenceMonth = body.date.slice(0,7);
        }
        db.transactions.push(transaction); save(); return reply({ transaction },201);
      }
      if (method === 'DELETE') { db.transactions = db.transactions.filter(x => x.id !== Number(url.searchParams.get('id'))); save(); return reply({ ok:true }); }
    }
    if (url.pathname === '/api/cards') {
      if (method === 'GET') return reply({ cards:db.cards, expenses:db.expenses, payments:db.payments });
      if (method === 'POST') {
        if (!['Deniz','Ege'].includes(body.person)) return reply({ error:'Geçersiz kişi' },400);
        if (body.action === 'statementDay') {
          if (!Number.isInteger(body.day) || body.day < 1 || body.day > 28) return reply({ error:'Geçersiz gün' },400);
          db.cards.find(x => x.person === body.person)!.statementDay = body.day;
        } else {
          if (!['expense','payment'].includes(body.action) || !Number.isFinite(body.amount) || body.amount <= 0 || !/^\d{4}-\d{2}-\d{2}$/.test(body.date)) return reply({ error:'Geçersiz işlem' },400);
          const row = add({ person:body.person, amount:body.amount, date:body.date, note:String(body.note ?? '').slice(0,80), category:body.category ?? 'Diğer' });
          (body.action === 'expense' ? db.expenses : db.payments).push(row);
        }
        save(); return reply({ ok:true });
      }
    }
    return reply({ error:'Bulunamadı' },404);
  } catch { return Response.json({ error:'Tarayıcı depolaması kullanılamıyor.' },{ status:500 }); }
}
