"use client";

import { useAuth } from "@/contexts/auth-context";

export default function DebugAuthPage() {
  const { user, loading } = useAuth();
  return (
    <div className="p-6 space-y-4">
      <h1 className="text-xl font-semibold">Auth Debug</h1>
      <div>
        <div className="font-medium">loading</div>
        <pre className="p-3 bg-muted rounded">{JSON.stringify(loading, null, 2)}</pre>
      </div>
      <div>
        <div className="font-medium">user</div>
        <pre className="p-3 bg-muted rounded whitespace-pre-wrap break-all">{JSON.stringify(user, null, 2)}</pre>
      </div>
      <a className="text-blue-600 underline" href="/admin">Ir a /admin</a>
    </div>
  );
}
