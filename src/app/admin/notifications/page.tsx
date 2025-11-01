"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { db } from "@/lib/firebase";
import { collection, getDocs, onSnapshot, query, orderBy } from "firebase/firestore";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface ModerationEvent {
  id: string;
  type?: string; // e.g., "report", "abuse"
  targetType?: string; // e.g., "post", "comment", "user"
  targetId?: string;
  reporterId?: string;
  reason?: string;
  createdAt?: string | number;
  [key: string]: any;
}

function makeMockData(): { reports: ModerationEvent[]; abuses: ModerationEvent[] } {
  const reasons = [
    "Lenguaje ofensivo",
    "Spam",
    "Contenido inapropiado",
    "Acoso",
    "Incitación al odio",
  ];
  const targets = [
    { targetType: "post", ids: ["post_101", "post_202", "post_303"] },
    { targetType: "comment", ids: ["cmt_a1", "cmt_b2", "cmt_c3"] },
    { targetType: "user", ids: ["usr_x1", "usr_y2", "usr_z3"] },
  ];
  const now = Date.now();
  const pick = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];
  const randInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

  const build = (type: string, n: number): ModerationEvent[] =>
    Array.from({ length: n }).map((_, i) => {
      const t = pick(targets);
      const targetId = pick(t.ids);
      return {
        id: `${type}_${i}_${targetId}`,
        type,
        targetType: t.targetType,
        targetId,
        reporterId: `rep_${randInt(1, 999)}`,
        reason: pick(reasons),
        createdAt: now - randInt(1, 300) * 60 * 1000,
      } as ModerationEvent;
    });

  return {
    reports: build("report", 8),
    abuses: build("abuse", 6),
  };
}

function makeCuratedDemo(): { reports: ModerationEvent[]; abuses: ModerationEvent[] } {
  const now = Date.now();
  const minutes = (m: number) => now - m * 60 * 1000;
  const curatedReports: ModerationEvent[] = [
    {
      id: "rep_post_001",
      type: "report",
      targetType: "post",
      targetId: "voz_98765",
      reporterId: "usr_aj23",
      reason: "Contenido inapropiado (lenguaje explícito)",
      createdAt: minutes(8),
      postTitle: "Reflexión nocturna",
    },
    {
      id: "rep_user_002",
      type: "report",
      targetType: "user",
      targetId: "user_maria",
      reporterId: "usr_lk77",
      reason: "Suplantación de identidad",
      createdAt: minutes(25),
      targetDisplay: "María P. (@maria)",
    },
    {
      id: "rep_post_003",
      type: "report",
      targetType: "post",
      targetId: "voz_44421",
      reporterId: "usr_rr12",
      reason: "Spam / enlace malicioso",
      createdAt: minutes(40),
      postTitle: "Gana dinero rápido!!!",
    },
  ];

  const curatedAbuses: ModerationEvent[] = [
    {
      id: "ab_cmt_101",
      type: "abuse",
      targetType: "comment",
      targetId: "cmt_aa11",
      reporterId: "usr_mv19",
      reason: "Acoso en comentarios",
      createdAt: minutes(5),
      commentPreview: "Eres un …",
      postId: "voz_98765",
    },
    {
      id: "ab_user_102",
      type: "abuse",
      targetType: "user",
      targetId: "user_toxic",
      reporterId: "usr_bb32",
      reason: "Comportamiento indebido reiterado",
      createdAt: minutes(15),
      targetDisplay: "Toxic User (@toxic)",
    },
    {
      id: "ab_cmt_103",
      type: "abuse",
      targetType: "comment",
      targetId: "cmt_cc22",
      reporterId: "usr_qp55",
      reason: "Incitación al odio",
      createdAt: minutes(60),
      commentPreview: "Todos los …",
      postId: "voz_11223",
    },
  ];

  return { reports: curatedReports, abuses: curatedAbuses };
}

export default function AdminNotificationsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [reports, setReports] = useState<ModerationEvent[]>([]);
  const [abuses, setAbuses] = useState<ModerationEvent[]>([]);
  const [fetching, setFetching] = useState(false);
  const [filterType, setFilterType] = useState<'all' | 'report' | 'abuse'>('all');
  const [filterTarget, setFilterTarget] = useState<'all' | 'post' | 'comment' | 'user'>('all');
  const [search, setSearch] = useState('');
  const [resolvedIds, setResolvedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.push("/login");
      return;
    }
    if (user.role !== "admin") {
      router.push("/");
      return;
    }
  }, [loading, user, router]);

  useEffect(() => {
    if (!user || user.role !== 'admin') return;
    const useDemo = process.env.NEXT_PUBLIC_ADMIN_NOTIF_DEMO === 'true';
    if (useDemo) {
      // Demo data only
      const demo = makeCuratedDemo();
      setReports(demo.reports);
      setAbuses(demo.abuses);
      return;
    }

    setFetching(true);
    // Realtime subscriptions
    const qReports = query(collection(db, 'reports'), orderBy('createdAt', 'desc'));
    const qAbuses = query(collection(db, 'abuses'), orderBy('createdAt', 'desc'));

    const unsub1 = onSnapshot(qReports, (snap) => {
      const data = snap.docs.map((d) => ({ id: d.id, type: 'report', ...d.data() })) as ModerationEvent[];
      setReports(data);
      setFetching(false);
    }, () => setFetching(false));

    const unsub2 = onSnapshot(qAbuses, (snap) => {
      const data = snap.docs.map((d) => ({ id: d.id, type: 'abuse', ...d.data() })) as ModerationEvent[];
      setAbuses(data);
      setFetching(false);
    }, () => setFetching(false));

    return () => {
      try { unsub1(); } catch {}
      try { unsub2(); } catch {}
    };
  }, [user?.id, user?.role]);

  const filteredAll: ModerationEvent[] = useMemo(() => {
    const all = [...reports, ...abuses];
    const s = search.trim().toLowerCase();
    return all.filter((e) => {
      if (resolvedIds.has(`${e.type}-${e.id}`)) return false;
      if (filterType !== 'all' && e.type !== filterType) return false;
      if (filterTarget !== 'all' && (e.targetType || 'unknown') !== filterTarget) return false;
      if (!s) return true;
      const blob = JSON.stringify(e).toLowerCase();
      return blob.includes(s);
    });
  }, [reports, abuses, filterType, filterTarget, search, resolvedIds]);

  const recentFeed: ModerationEvent[] = useMemo(() => {
    return filteredAll
      .map((e) => ({
        ...e,
        _ts:
          typeof e.createdAt === 'number'
            ? e.createdAt
            : e.createdAt
            ? Date.parse(String(e.createdAt)) || 0
            : 0,
      }))
      .sort((a, b) => b._ts - a._ts)
      .slice(0, 50);
  }, [filteredAll]);

  type AggKey = string;
  const aggregates = useMemo(() => {
    const map = new Map<AggKey, { count: number; item: ModerationEvent }>();
    const add = (e: ModerationEvent) => {
      const key = `${e.type || "unknown"}|${e.targetType || "unknown"}|${e.targetId || "unknown"}`;
      const prev = map.get(key);
      if (prev) {
        prev.count += 1;
      } else {
        map.set(key, { count: 1, item: e });
      }
    };
    filteredAll.forEach(add);
    return Array.from(map.entries())
      .map(([k, v]) => ({ key: k, ...v }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20);
  }, [filteredAll]);

  if (loading || !user || user.role !== "admin") {
    return <div className="p-6">Cargando...</div>;
  }

  const demoEnabled = process.env.NEXT_PUBLIC_ADMIN_NOTIF_DEMO === 'true';

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Notificaciones de Administración {demoEnabled && <span className="ml-2 text-xs px-2 py-1 rounded bg-amber-100 text-amber-800">Demo</span>}</h1>
        <div className="flex items-center gap-2">
          <Button onClick={() => router.push("/admin")} variant="outline">Volver al Panel</Button>
          <Button onClick={() => location.reload()} variant="outline">Actualizar</Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
          <CardDescription>Refina la vista por tipo, objetivo o búsqueda.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-3 items-start md:items-center">
            <div className="flex items-center gap-2">
              <label className="text-sm">Tipo:</label>
              <select className="border rounded px-2 py-1 text-sm" value={filterType} onChange={e=>setFilterType(e.target.value as any)}>
                <option value="all">Todos</option>
                <option value="report">Reportes</option>
                <option value="abuse">Abusos</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm">Objetivo:</label>
              <select className="border rounded px-2 py-1 text-sm" value={filterTarget} onChange={e=>setFilterTarget(e.target.value as any)}>
                <option value="all">Todos</option>
                <option value="post">Publicación</option>
                <option value="comment">Comentario</option>
                <option value="user">Usuario</option>
              </select>
            </div>
            <div className="flex-1 min-w-[200px]">
              <Input placeholder="Buscar por texto, id, razón..." value={search} onChange={e=>setSearch(e.target.value)} />
            </div>
            {resolvedIds.size > 0 && (
              <Button variant="outline" onClick={()=>setResolvedIds(new Set())}>Limpiar 'resueltos'</Button>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>Agregados</CardTitle>
            <CardDescription>Top de objetivos con más eventos.</CardDescription>
          </CardHeader>
          <CardContent>
            {fetching && <p className="text-sm">Cargando...</p>}
            {aggregates.length === 0 ? (
              <p className="text-sm text-muted-foreground">No hay datos.</p>
            ) : (
              <ul className="space-y-2">
                {aggregates.map(({ key, count, item }) => (
                  <li key={key} className="p-3 border rounded text-sm">
                    <div className="font-medium">{(item.targetType || "objetivo").toUpperCase()} · {item.targetId || "(sin id)"}</div>
                    <div className="text-xs text-muted-foreground">
                      Tipo: {item.type || "desconocido"} · Total: {count}
                    </div>
                    {item.reason && (
                      <div className="text-xs break-all">Última razón: {item.reason}</div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Actividad Reciente</CardTitle>
            <CardDescription>Eventos de moderación más recientes.</CardDescription>
          </CardHeader>
          <CardContent>
            {fetching && <p className="text-sm">Cargando...</p>}
            {recentFeed.length === 0 ? (
              <p className="text-sm text-muted-foreground">No hay actividad reciente.</p>
            ) : (
              <ul className="space-y-2">
                {recentFeed.map((e) => (
                  <li key={`${e.type}-${e.id}`} className="p-3 border rounded text-sm">
                    <div className="flex items-center justify-between">
                      <div className="font-medium">
                        {(e.type || "Evento").toUpperCase()} · {(e.targetType || "Objetivo").toUpperCase()} · {e.targetId || "(sin id)"}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {typeof e.createdAt === "number"
                          ? new Date(e.createdAt).toLocaleString()
                          : e.createdAt
                          ? new Date(String(e.createdAt)).toLocaleString()
                          : ""}
                      </div>
                    </div>
                    {e.reason && <div className="text-xs">Razón: {e.reason}</div>}
                    {e.reporterId && (
                      <div className="text-xs text-muted-foreground">Reportado por: {e.reporterId}</div>
                    )}
                    <div className="text-xs text-muted-foreground break-all">{JSON.stringify(e)}</div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        onClick={() => {
                          try { navigator.clipboard.writeText(`${e.type}:${e.targetType}:${e.targetId}`); } catch {}
                        }}
                        size="sm"
                      >Copiar IDs</Button>
                      <Button
                        variant="outline"
                        onClick={() => alert(`Abrir ${e.targetType} ${e.targetId} (placeholder)`)}
                        size="sm"
                      >Ver objetivo</Button>
                      <Button
                        variant="secondary"
                        onClick={() => setResolvedIds(prev => new Set(prev).add(`${e.type}-${e.id}`))}
                        size="sm"
                      >Marcar como resuelto</Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
