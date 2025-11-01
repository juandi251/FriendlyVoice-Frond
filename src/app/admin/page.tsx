"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { api } from "@/lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Flag, Trash2, User, MessageSquare } from "lucide-react";

interface ReportDoc {
  id: string;
  vozId: string;
  userId: string;
  motivo: string;
  mensaje?: string;
  createdAt: any;
  status: string;
  [key: string]: any;
}

export default function AdminDashboardPage() {
  const { user, loading, getUserById } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [reports, setReports] = useState<ReportDoc[]>([]);
  const [abuses, setAbuses] = useState<ReportDoc[]>([]);
  const [fetching, setFetching] = useState(false);
  const [userNames, setUserNames] = useState<Record<string, string>>({});

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
    const fetchData = async () => {
      if (!user || user.role !== "admin") return;
      try {
        setFetching(true);
        const reportes = await api.get<ReportDoc[]>("/api/reportes");
        setReports(reportes);
        // Mantener abuses por compatibilidad
        setAbuses([]);

        // Obtener nombres de usuarios que reportaron
        const uniqueUserIds = Array.from(new Set(reportes.map(r => r.userId)));
        const userNamesMap: Record<string, string> = {};
        
        await Promise.all(
          uniqueUserIds.map(async (userId) => {
            try {
              const userInfo = await getUserById(userId);
              if (userInfo) {
                userNamesMap[userId] = userInfo.name || 'Usuario sin nombre';
              } else {
                userNamesMap[userId] = userId.substring(0, 12) + '...';
              }
            } catch (error) {
              userNamesMap[userId] = userId.substring(0, 12) + '...';
            }
          })
        );
        
        setUserNames(userNamesMap);
      } catch (e: any) {
        toast({
          title: "Error al cargar reportes",
          description: e.message || "No se pudieron cargar los reportes",
          variant: "destructive",
        });
      } finally {
        setFetching(false);
      }
    };
    fetchData();
  }, [user?.id, user?.role, getUserById]);

  const handleDeleteReport = async (reportId: string) => {
    try {
      await api.delete(`/api/reportes/${reportId}`);
      setReports(prev => prev.filter(r => r.id !== reportId));
      toast({ title: "Reporte eliminado", description: "El reporte ha sido eliminado exitosamente." });
    } catch (e: any) {
      toast({
        title: "Error al eliminar reporte",
        description: e.message || "No se pudo eliminar el reporte",
        variant: "destructive",
      });
    }
  };

  if (loading || !user || user.role !== "admin") {
    return <div className="p-6">Cargando...</div>;
  }

  return (
    <div className="relative max-w-6xl mx-auto p-4 space-y-6 min-h-screen">
      {/* Logo de fondo con esquema circular */}
      <div 
        className="fixed inset-0 flex items-center justify-center pointer-events-none"
        style={{ 
          zIndex: 0,
          opacity: 0.25 
        }}
      >
        <div className="relative w-[600px] h-[600px]">
          {/* Círculo de fondo con blur y gradiente */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-blue-500/30 via-purple-500/25 to-pink-500/25 blur-3xl"></div>
          
          {/* Contenedor circular para el logo */}
          <div className="relative w-full h-full rounded-full bg-gradient-to-br from-blue-500/60 via-purple-500/50 to-pink-500/50 flex items-center justify-center overflow-hidden border-4 border-blue-400/50 shadow-2xl">
            {/* Logo SVG - micrófono con mano */}
            <svg 
              viewBox="0 0 400 400" 
              className="w-3/4 h-3/4"
              xmlns="http://www.w3.org/2000/svg"
              preserveAspectRatio="xMidYMid meet"
            >
              <defs>
                <linearGradient id="adminMicGradientLogo" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#93c5fd"/>
                  <stop offset="50%" stopColor="#6366f1"/>
                  <stop offset="100%" stopColor="#4f46e5"/>
                </linearGradient>
                <linearGradient id="adminHandGradientLogo" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#fb923c"/>
                  <stop offset="50%" stopColor="#fbbf24"/>
                  <stop offset="100%" stopColor="#f87171"/>
                </linearGradient>
              </defs>
              
              {/* Micrófono */}
              <g transform="translate(200, 120)">
                <ellipse cx="0" cy="0" rx="45" ry="60" fill="url(#adminMicGradientLogo)" stroke="#3b82f6" strokeWidth="3"/>
                <line x1="-20" y1="-25" x2="-20" y2="-15" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round"/>
                <line x1="0" y1="-25" x2="0" y2="-15" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round"/>
                <line x1="20" y1="-25" x2="20" y2="-15" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round"/>
                <rect x="-5" y="50" width="10" height="15" fill="#3b82f6" rx="2"/>
              </g>
              
              {/* Mano */}
              <g transform="translate(200, 260)">
                <ellipse cx="0" cy="20" rx="50" ry="40" fill="url(#adminHandGradientLogo)" stroke="#f97316" strokeWidth="3"/>
                <ellipse cx="-35" cy="0" rx="12" ry="30" fill="url(#adminHandGradientLogo)" stroke="#f97316" strokeWidth="2"/>
                <ellipse cx="-18" cy="-5" rx="12" ry="32" fill="url(#adminHandGradientLogo)" stroke="#f97316" strokeWidth="2"/>
                <ellipse cx="2" cy="-8" rx="12" ry="35" fill="url(#adminHandGradientLogo)" stroke="#f97316" strokeWidth="2"/>
                <ellipse cx="22" cy="-5" rx="12" ry="32" fill="url(#adminHandGradientLogo)" stroke="#f97316" strokeWidth="2"/>
                <ellipse cx="38" cy="0" rx="12" ry="28" fill="url(#adminHandGradientLogo)" stroke="#f97316" strokeWidth="2"/>
              </g>
            </svg>
          </div>
          
          {/* Resplandor adicional más visible */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-blue-500/70 via-purple-500/60 to-pink-500/60 blur-2xl"></div>
        </div>
      </div>

      <div className="flex items-center justify-between relative z-10 bg-background/80 p-4 rounded-lg">
        <h1 className="text-2xl font-semibold">Panel de Administración</h1>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => router.push('/admin/users')}
            variant="default"
          >
            Gestión de Usuarios
          </Button>
          <Button
            onClick={() => router.push('/admin/notifications')}
            variant="secondary"
          >
            Notificaciones
          </Button>
          <Button onClick={() => location.reload()} variant="outline">Actualizar</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative" style={{ zIndex: 10 }}>
        <Card className="bg-background/95 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Flag className="h-5 w-5" />
              Reportes de Publicaciones
            </CardTitle>
            <CardDescription>Publicaciones reportadas por la comunidad.</CardDescription>
          </CardHeader>
          <CardContent>
            {fetching ? (
              <div className="flex items-center justify-center p-4">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : reports.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No hay reportes pendientes.</p>
            ) : (
              <div className="space-y-3">
                {reports.map((r) => (
                  <div key={r.id} className="p-4 border rounded-lg bg-red-50 dark:bg-red-950">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="destructive">Reporte</Badge>
                          {r.status === 'pendiente' && (
                            <Badge variant="outline" className="border-yellow-500 text-yellow-700">
                              Pendiente
                            </Badge>
                          )}
                        </div>
                        <div className="text-sm space-y-1">
                          <p className="font-medium">Publicación ID: <span className="font-mono text-xs">{r.vozId}</span></p>
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <User className="h-4 w-4" />
                            <span>
                              Reportado por: <span className="font-semibold text-foreground">
                                {userNames[r.userId] || r.userId.substring(0, 12) + '...'}
                              </span>
                            </span>
                          </div>
                          {r.motivo && (
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Flag className="h-4 w-4" />
                              <span>
                                Motivo: <span className="font-semibold text-foreground">{r.motivo}</span>
                              </span>
                            </div>
                          )}
                          {r.mensaje && (
                            <div className="flex items-start gap-2 mt-2 p-2 bg-muted rounded-md">
                              <MessageSquare className="h-4 w-4 mt-0.5 flex-shrink-0" />
                              <div className="flex-1">
                                <p className="text-xs font-medium mb-1">Mensaje del usuario:</p>
                                <p className="text-sm text-foreground whitespace-pre-wrap">{r.mensaje}</p>
                              </div>
                            </div>
                          )}
                          {r.createdAt && (
                            <p className="text-xs text-muted-foreground mt-2">
                              {(() => {
                                try {
                                  // Intentar parsear la fecha en diferentes formatos
                                  let date: Date;
                                  if (r.createdAt?.toDate) {
                                    // Firestore Timestamp
                                    date = r.createdAt.toDate();
                                  } else if (r.createdAt?.seconds) {
                                    // Firestore Timestamp como objeto
                                    date = new Date(r.createdAt.seconds * 1000);
                                  } else if (typeof r.createdAt === 'string') {
                                    date = new Date(r.createdAt);
                                  } else if (typeof r.createdAt === 'number') {
                                    date = new Date(r.createdAt);
                                  } else {
                                    return 'Fecha no disponible';
                                  }
                                  
                                  if (isNaN(date.getTime())) {
                                    return 'Fecha inválida';
                                  }
                                  
                                  return date.toLocaleString('es-ES', {
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  });
                                } catch {
                                  return 'Fecha no disponible';
                                }
                              })()}
                            </p>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteReport(r.id)}
                        className="text-destructive hover:text-destructive/90"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-background/95 backdrop-blur-sm">
          <CardHeader>
            <CardTitle>Abusos</CardTitle>
            <CardDescription>Incidentes o señalamientos de abuso.</CardDescription>
          </CardHeader>
          <CardContent>
            {fetching && <p className="text-sm">Cargando...</p>}
            {abuses.length === 0 ? (
              <p className="text-sm text-muted-foreground">No hay registros de abuso.</p>
            ) : (
              <ul className="space-y-2">
                {abuses.map((a) => (
                  <li key={a.id} className="p-3 border rounded">
                    <div className="text-sm font-medium">ID: {a.id}</div>
                    <div className="text-xs text-muted-foreground break-all">{JSON.stringify(a)}</div>
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
