/**
 * Generic DocStore adapters (in-memory and Firestore) for the transactional
 * layer. Kept in one small file so a new database only needs this port.
 */
import { FieldValue, type Firestore } from "firebase-admin/firestore";
import type { BatchOp, DocStore, Increment, Query, Where } from "./types";

const isInc = (v: unknown): v is Increment => typeof v === "object" && v !== null && "__inc" in v;
const clone = <T,>(v: T): T => structuredClone(v);

/* ------------------------------------------------------------------ memory */

const g = globalThis as unknown as { __easyStayDocs?: Map<string, Map<string, Record<string, unknown>>> };
const tables = () => (g.__easyStayDocs ??= new Map());
const table = (path: string) => {
  const t = tables();
  if (!t.has(path)) t.set(path, new Map());
  return t.get(path)!;
};

function applyPatch(cur: Record<string, unknown>, patch: Record<string, unknown>) {
  for (const [k, v] of Object.entries(patch)) cur[k] = isInc(v) ? ((cur[k] as number) ?? 0) + v.__inc : clone(v);
}

function matches(doc: Record<string, unknown>, [f, op, v]: Where): boolean {
  const x = doc[f] as never;
  switch (op) {
    case "==": return x === v;
    case "!=": return x !== v;
    case "<": return x < (v as never);
    case "<=": return x <= (v as never);
    case ">": return x > (v as never);
    case ">=": return x >= (v as never);
    case "in": return (v as unknown[]).includes(x as unknown);
    case "array-contains": return Array.isArray(x) && (x as unknown[]).includes(v);
  }
}

export function memoryDocStore<T extends { id: string }>(path: string): DocStore<T> {
  const t = table(path);
  const out = (id: string) => (t.has(id) ? ({ id, ...clone(t.get(id)!) } as unknown as T) : null);
  return {
    async get(id) { return out(id); },
    async getMany(ids) { return ids.map(out).filter((x): x is T => !!x); },
    async set(id, data) { t.set(id, clone(data) as Record<string, unknown>); },
    async create(id, data) {
      if (t.has(id)) return false;
      t.set(id, clone(data) as Record<string, unknown>);
      return true;
    },
    async merge(id, patch) {
      const cur = t.get(id) ?? {};
      applyPatch(cur, patch);
      t.set(id, cur);
    },
    async delete(id) { t.delete(id); },
    async query(q: Query) {
      let rows = [...t.entries()].map(([id, d]) => ({ id, ...d }) as Record<string, unknown>);
      for (const w of q.where ?? []) rows = rows.filter((r) => matches(r, w));
      if (q.orderBy) {
        const [f, dir] = q.orderBy;
        const sign = dir === "asc" ? 1 : -1;
        rows.sort((a, b) => ((a[f] as number) > (b[f] as number) ? sign : (a[f] as number) < (b[f] as number) ? -sign : String(a.id) < String(b.id) ? -sign : String(a.id) > String(b.id) ? sign : 0));
        if (q.after !== undefined) rows = rows.filter((r) => (dir === "asc" ? (r[f] as number) > (q.after as number) : (r[f] as number) < (q.after as number)));
      }
      return clone(rows.slice(0, q.limit ?? 50)) as unknown as T[];
    },
    async update(id, fn) {
      const { next, result } = fn(out(id));
      if (next) t.set(id, clone(next) as Record<string, unknown>);
      return result;
    },
  };
}

export async function memoryBatch(ops: BatchOp[]) {
  for (const o of ops) {
    const t = table(o.path);
    if (o.op === "delete") t.delete(o.id);
    else if (o.op === "set") t.set(o.id, clone(o.data));
    else {
      const cur = t.get(o.id) ?? {};
      applyPatch(cur, o.data);
      t.set(o.id, cur);
    }
  }
}

/* --------------------------------------------------------------- firestore */

const fsValue = (v: unknown) => (isInc(v) ? FieldValue.increment(v.__inc) : v);
const fsPatch = (p: Record<string, unknown>) => Object.fromEntries(Object.entries(p).map(([k, v]) => [k, fsValue(v)]));

export function firestoreDocStore<T extends { id: string }>(fs: Firestore, path: string): DocStore<T> {
  const col = fs.collection(path);
  const row = (s: FirebaseFirestore.DocumentSnapshot) => ({ id: s.id, ...s.data() }) as unknown as T;
  return {
    async get(id) {
      const s = await col.doc(id).get();
      return s.exists ? row(s) : null;
    },
    async getMany(ids) {
      const refs = [...new Set(ids)].filter(Boolean).map((id) => col.doc(id));
      return refs.length ? (await fs.getAll(...refs)).filter((s) => s.exists).map(row) : [];
    },
    async set(id, data) { await col.doc(id).set(data as object); },
    async create(id, data) {
      try {
        await col.doc(id).create(data as object);
        return true;
      } catch (e) {
        if ((e as { code?: number }).code === 6) return false; // ALREADY_EXISTS
        throw e;
      }
    },
    async merge(id, patch) { await col.doc(id).set(fsPatch(patch), { merge: true }); },
    async delete(id) { await col.doc(id).delete(); },
    async query(q) {
      let ref: FirebaseFirestore.Query = col;
      for (const [f, op, v] of q.where ?? []) ref = ref.where(f, op === "in" ? "in" : op, v);
      if (q.orderBy) {
        ref = ref.orderBy(q.orderBy[0], q.orderBy[1]);
        if (q.after !== undefined) ref = ref.startAfter(q.after);
      }
      return (await ref.limit(q.limit ?? 50).get()).docs.map(row);
    },
    async update(id, fn) {
      const ref = col.doc(id);
      return fs.runTransaction(async (tx) => {
        const s = await tx.get(ref);
        const { next, result } = fn(s.exists ? row(s) : null);
        if (next) tx.set(ref, next as object);
        return result;
      });
    },
  };
}

export async function firestoreBatch(fs: Firestore, ops: BatchOp[]) {
  const b = fs.batch();
  for (const o of ops) {
    const ref = fs.collection(o.path).doc(o.id);
    if (o.op === "delete") b.delete(ref);
    else if (o.op === "set") b.set(ref, o.data);
    else b.set(ref, fsPatch(o.data), { merge: true });
  }
  await b.commit();
}
