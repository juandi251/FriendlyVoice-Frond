"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { api } from "@/lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Lock, Unlock } from "lucide-react";

interface UserListItem {
  id: string;
  email: string | null;
  name: string | null;
  role?: string;
  isBlocked?: boolean;
}

export default function AdminUsersPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [users, setUsers] = useState<UserListItem[]>([]);
  const [fetching, setFetching] = useState(false);
  const [unlocking, setUnlocking] = useState<string | null>(null);

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
    const fetchUsers = async () => {
      if (!user || user.role !== "admin") return;
      try {
        setFetching(true);
        const allUsers = await api.get<UserListItem[]>("/api/usuarios");
        console.log('Usuarios cargados en admin:', allUsers);
        console.log('Usuarios bloqueados:', allUsers.filter(u => u.isBlocked === true));
        setUsers(allUsers);
      } catch (e: any) {
        toast({
          title: "Error al cargar usuarios",
          description: e.message || "No se pudieron cargar los usuarios",
          variant: "destructive",
        });
      } finally {
        setFetching(false);
      }
    };
    fetchUsers();
  }, [user?.id, user?.role]);

  const handleUnlock = async (userId: string) => {
    try {
      setUnlocking(userId);
      await api.post(`/api/usuarios/${userId}/desbloquear`);
      
      // Recargar la lista de usuarios desde el backend
      const allUsers = await api.get<UserListItem[]>("/api/usuarios");
      setUsers(allUsers);
      
      toast({
        title: "Cuenta desbloqueada",
        description: "El usuario puede iniciar sesión nuevamente. Los intentos de login han sido reseteados.",
      });
    } catch (e: any) {
      toast({
        title: "Error al desbloquear cuenta",
        description: e.message || "No se pudo desbloquear la cuenta",
        variant: "destructive",
      });
    } finally {
      setUnlocking(null);
    }
  };

  if (loading || !user || user.role !== "admin") {
    return <div className="p-6">Cargando...</div>;
  }

  const lockedUsers = users.filter(u => u.isBlocked === true);
  const activeUsers = users.filter(u => u.isBlocked !== true);
  
  // Log para debugging
  console.log('Filtrado de usuarios:', {
    total: users.length,
    bloqueados: lockedUsers.length,
    activos: activeUsers.length,
    usuariosConIsBlocked: users.filter(u => u.isBlocked !== undefined).map(u => ({ id: u.id, email: u.email, isBlocked: u.isBlocked })),
    todosLosUsuarios: users.map(u => ({ id: u.id, email: u.email, isBlocked: u.isBlocked, name: u.name }))
  });

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Gestión de Usuarios</h1>
        <div className="flex items-center gap-2">
          <Button onClick={() => router.push("/admin")} variant="outline">
            Volver al Panel
          </Button>
          <Button onClick={() => location.reload()} variant="outline">
            Actualizar
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Total de Usuarios</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{users.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Usuarios Activos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{activeUsers.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Cuentas Bloqueadas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">{lockedUsers.length}</div>
          </CardContent>
        </Card>
      </div>

      {fetching ? (
        <div className="flex items-center justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : (
        <>
          {lockedUsers.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Cuentas Bloqueadas</CardTitle>
                <CardDescription>
                  Usuarios que excedieron el límite de intentos de inicio de sesión
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {lockedUsers.map((u) => (
                    <div
                      key={u.id}
                      className="flex items-center justify-between p-4 border rounded-lg bg-red-50"
                    >
                      <div className="flex items-center gap-3">
                        <Lock className="h-5 w-5 text-red-600" />
                        <div>
                          <div className="font-medium">{u.name || "Sin nombre"}</div>
                          <div className="text-sm text-muted-foreground">{u.email}</div>
                          {u.role === "admin" && (
                            <Badge variant="destructive" className="mt-1">
                              Admin
                            </Badge>
                          )}
                        </div>
                      </div>
                      <Button
                        onClick={() => handleUnlock(u.id)}
                        disabled={unlocking === u.id}
                        variant="default"
                        size="sm"
                      >
                        {unlocking === u.id ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <Unlock className="h-4 w-4 mr-2" />
                        )}
                        Desbloquear
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Todos los Usuarios</CardTitle>
              <CardDescription>Lista completa de usuarios registrados</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {users.map((u) => (
                  <div
                    key={u.id}
                    className={`flex items-center justify-between p-3 border rounded ${
                      u.isBlocked ? "bg-red-50" : ""
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {u.isBlocked ? (
                        <Lock className="h-4 w-4 text-red-600" />
                      ) : (
                        <Unlock className="h-4 w-4 text-green-600" />
                      )}
                      <div>
                        <div className="font-medium text-sm">{u.name || "Sin nombre"}</div>
                        <div className="text-xs text-muted-foreground">{u.email}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {u.role === "admin" && (
                        <Badge variant="secondary">Admin</Badge>
                      )}
                      {u.isBlocked ? (
                        <Badge variant="destructive">Bloqueada</Badge>
                      ) : (
                        <Badge variant="outline" className="text-green-600 border-green-600">
                          Activa
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
