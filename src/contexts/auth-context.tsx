// src/contexts/auth-context.tsx
// Este contexto gestiona la autenticación de usuarios con Firebase Authentication
// y la persistencia de datos de perfil en Cloud Firestore, incluyendo el flujo de onboarding.

"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useRef,
} from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  User as FirebaseUser,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendEmailVerification,
} from "firebase/auth";
import { auth } from "@/lib/firebase";
import { api } from "@/lib/api";

// Define la estructura del usuario para tu aplicación
export interface User {
  id: string;
  email: string | null;
  name: string | null;
  emailVerified?: boolean;
  avatarUrl?: string;
  bio?: string;
  followers?: string[]; // IDs de usuarios que siguen a este usuario
  following?: string[]; // IDs de usuarios que este usuario sigue
  interests?: string[];
  personalityTags?: string[];
  bioSoundUrl?: string;
  dateOfBirth?: string; // ¡CAMBIO! Fecha de nacimiento como string (YYYY-MM-DD)
  hobbies?: string[];
  onboardingComplete: boolean; // Para saber si el usuario completó el onboarding
  role?: 'admin' | 'user';
  isBlocked?: boolean; // Estado de bloqueo de cuenta
  loginAttempts?: number; // Número de intentos fallidos de login
}

// Define la estructura de un mensaje directo
export interface Message {
  id: string;
  chatId: string;
  senderId: string;
  recipientId: string;
  voiceUrl: string;
  createdAt: string;
  isRead: boolean;
}

// Define el tipo para el contexto de autenticación
interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, name: string, dateOfBirth: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUserAvatar: (avatarUrl: string) => Promise<void>;
  updateUserProfile: (data: Partial<User>) => Promise<void>;
  completeOnboarding: (data: { hobbies: string[]; bioSoundUrl: string; avatarUrl: string; }) => Promise<void>;
  followUser: (userIdToFollow: string) => Promise<void>;
  unfollowUser: (userIdToUnfollow: string) => Promise<void>;
  isFollowing: (userIdToCheck: string) => boolean;
  getUserById: (userId: string) => Promise<User | undefined>;
  getMutualFollows: () => User[];
  getDirectMessages: (chatPartnerId: string) => Message[];
  fetchDirectMessages: (chatPartnerId: string) => Promise<Message[]>;
  sendDirectMessage: (recipientId: string, voiceDataUri: string) => Promise<void>;
  getUnreadMessagesCount: () => Promise<number>;
  getUnreadMessagesCountForChat: (chatPartnerId: string) => Promise<number>;
  markMessageAsRead: (messageId: string) => Promise<void>;
  markChatAsRead: (chatPartnerId: string) => Promise<void>;
  unreadMessagesCount: number; // Contador global de mensajes sin leer
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [allUsersInMemory, setAllUsersInMemory] = useState<User[]>([]); 
  const [directMessagesInMemory, setDirectMessagesInMemory] = useState<Message[]>([]);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);
  const unreadCountLoadingRef = useRef(false);
  const unreadCountIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const router = useRouter();
  const pathname = usePathname();
  const lastUidRef = useRef<string | null>(null);

  // Helper function para reintentar fetch con delay
  const fetchUserWithRetry = async (uid: string, maxRetries = 3, delayMs = 1000): Promise<User> => {
    for (let i = 0; i < maxRetries; i++) {
      try {
        const userData = await api.get<User>(`/api/usuarios/${uid}`);
        return userData;
      } catch (error) {
        if (i === maxRetries - 1) throw error; // Último intento, lanzar error
        // Esperar antes de reintentar
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
    throw new Error('Usuario no encontrado después de reintentos');
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          // Intentar obtener usuario con reintentos (para manejar race condition en registro)
          const userData = await fetchUserWithRetry(firebaseUser.uid);
          
          // CRÍTICO: Verificar OBLIGATORIAMENTE si la cuenta está bloqueada ANTES de resetear intentos
          // Esta verificación DEBE ocurrir cuando el usuario se autentica o recarga la página
          let isBlocked = false;
          try {
            console.log("🔒 Verificando estado de bloqueo en onAuthStateChanged...");
            console.log("Datos del usuario desde fetchUserWithRetry:", {
              id: userData.id,
              email: userData.email,
              isBlocked: userData.isBlocked
            });
            
            if (userData.isBlocked) {
              console.log("🚫 Cuenta bloqueada detectada en userData.isBlocked");
              isBlocked = true;
            } else {
              // CRÍTICO: Verificar nuevamente desde el backend para asegurar que está actualizado
              // Esto es especialmente importante después de recargar la página
              console.log("Verificando nuevamente desde el backend para confirmar estado...");
              const userCheck = await api.get<User>(`/api/usuarios/${firebaseUser.uid}`);
              console.log("Estado del usuario desde backend:", {
                id: userCheck.id,
                email: userCheck.email,
                isBlocked: userCheck.isBlocked,
                loginAttempts: userCheck.loginAttempts
              });
              
              if (userCheck.isBlocked) {
                console.log("🚫 Cuenta bloqueada detectada en verificación del backend");
                isBlocked = true;
              } else {
                console.log("✓ Cuenta NO bloqueada - continuando...");
              }
            }
          } catch (checkError: any) {
            console.log("Error al verificar estado de bloqueo:", {
              status: checkError.status,
              message: checkError.message,
              data: checkError.data
            });
            
            // Si el backend devuelve 403 (FORBIDDEN), significa que la cuenta está bloqueada
            if (checkError.status === 403) {
              console.log("🚫 Backend devolvió 403 FORBIDDEN - cuenta bloqueada");
              isBlocked = true;
            } else {
              // Si no se puede verificar, asumir bloqueado por seguridad
              console.error("❌ Error al verificar estado de bloqueo en onAuthStateChanged:", checkError);
              console.log("No se puede verificar estado - haciendo logout por seguridad");
              await signOut(auth);
              setUser(null);
              setAllUsersInMemory([]);
              setUnreadMessagesCount(0);
              setLoading(false);
              router.push('/login');
              return;
            }
          }
          
          // CRÍTICO: Si está bloqueado, hacer logout inmediatamente y NO resetear intentos
          if (isBlocked) {
            console.log("╔══════════════════════════════════════════════════════════════╗");
            console.log("║ 🚫 CUENTA BLOQUEADA - DENEGANDO ACCESO                         ║");
            console.log("║ Usuario ID: " + firebaseUser.uid);
            console.log("║ Haciendo logout inmediatamente...                              ║");
            console.log("╚══════════════════════════════════════════════════════════════╝");
            await signOut(auth);
            setUser(null);
            setAllUsersInMemory([]);
            setUnreadMessagesCount(0);
            setLoading(false);
            // Redirigir al login con mensaje de error
            router.push('/login');
            // El error se mostrará en el componente de login
            return; // NO continuar con el login
          }
          
          // Verificación de correo eliminada por requerimiento: no bloquear por email no verificado
          
          // IMPORTANTE: Solo resetear intentos si la cuenta NO está bloqueada
          // Usar el endpoint específico que verifica el bloqueo antes de resetear
          try {
            await api.post(`/api/usuarios/${firebaseUser.uid}/resetear-intentos`);
          } catch (e) {
            console.error("Error al resetear intentos de login:", e);
            // Si hay error al resetear, verificar nuevamente si está bloqueado
            // Si está bloqueado, hacer logout
            try {
              const userCheck = await api.get<User>(`/api/usuarios/${firebaseUser.uid}`);
              if (userCheck.isBlocked) {
                console.log("Cuenta bloqueada detectada después de intentar resetear - haciendo logout");
                await signOut(auth);
                setUser(null);
                setAllUsersInMemory([]);
                setUnreadMessagesCount(0);
                setLoading(false);
                router.push('/login');
                return;
              }
            } catch (checkError) {
              console.error("Error al verificar bloqueo después de resetear intentos:", checkError);
              // Si no se puede verificar, hacer logout por seguridad
              await signOut(auth);
              setUser(null);
              setAllUsersInMemory([]);
              setUnreadMessagesCount(0);
              setLoading(false);
              router.push('/login');
              return;
            }
          }
          
          // Si Firebase ya marcó verificado y backend aún no, sincronizar
          if (firebaseUser.emailVerified && !userData.emailVerified) {
            try { await api.put(`/api/usuarios/${firebaseUser.uid}`, { emailVerified: true }); } catch {}
            userData.emailVerified = true;
          }
          // Asegurar que onboardingComplete sea boolean (no null/undefined)
          if (userData.onboardingComplete === undefined || userData.onboardingComplete === null) {
            userData.onboardingComplete = false;
          }
          setUser(userData);
          setAllUsersInMemory(prev => [...prev, userData]);
        } catch (error: any) {
          console.error(`Error fetching user ${firebaseUser.uid} from API:`, error.message);
          const newUserData: User = {
            id: firebaseUser.uid,
            email: firebaseUser.email,
            name: firebaseUser.email?.split('@')[0] || "Nuevo Usuario",
            emailVerified: firebaseUser.emailVerified,
            avatarUrl: `https://api.dicebear.com/7.x/personas/svg?seed=${firebaseUser.uid}`,
            bio: "",
            followers: [],
            following: [],
            interests: [],
            personalityTags: [],
            bioSoundUrl: "",
            dateOfBirth: undefined, 
            hobbies: [],
            onboardingComplete: false,
            role: (() => {
              const admins = (process.env.NEXT_PUBLIC_ADMIN_EMAILS || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
              const email = firebaseUser.email?.toLowerCase() || '';
              return admins.includes(email) ? 'admin' : 'user';
            })(),
          };
          await api.post<User>(`/api/usuarios/${firebaseUser.uid}`, newUserData);
          setUser(newUserData);
          setAllUsersInMemory(prev => [...prev, newUserData]);
        }
      } else {
        setUser(null);
        setAllUsersInMemory([]);
        setUnreadMessagesCount(0);
        if (unreadCountIntervalRef.current) {
          clearInterval(unreadCountIntervalRef.current);
          unreadCountIntervalRef.current = null;
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Controla la redirección después de la carga inicial de autenticación
  const didReloadRef = useRef(false);
  useEffect(() => {
    const authPages = ['/login', '/register', '/onboarding']; // Páginas relacionadas con la autenticación

    if (loading) return;

    const decide = async () => {
      if (user) {
        // No bloquear por verificación de email
        if (!user.onboardingComplete) {
          if (pathname !== '/onboarding') router.replace('/onboarding');
          return;
        }

        // Usuario completo: si está en páginas de auth, llévalo a /profile
        if (authPages.includes(pathname)) {
          router.replace('/profile');
          return;
        }
      } else {
        // Usuario NO autenticado
        if (!authPages.includes(pathname)) router.replace('/login');
      }
    };

    void decide();
  }, [loading, user, router, pathname]);


  const signup = async (email: string, password: string, name: string, dateOfBirth: string) => { 
    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;

      // Envío de verificación de correo eliminado por requerimiento

      const newUserProfile: User = {
        id: firebaseUser.uid,
        email: firebaseUser.email,
        name: name,
        emailVerified: firebaseUser.emailVerified, 
        avatarUrl: `https://api.dicebear.com/7.x/personas/svg?seed=${firebaseUser.uid}`,
        bio: "",
        followers: [],
        following: [],
        interests: [],
        personalityTags: [],
        bioSoundUrl: "",
        dateOfBirth: dateOfBirth, 
        hobbies: [],
        onboardingComplete: false,
        role: (() => {
          const admins = (process.env.NEXT_PUBLIC_ADMIN_EMAILS || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
          const e = firebaseUser.email?.toLowerCase() || '';
          return admins.includes(e) ? 'admin' : 'user';
        })(),
      };
      // Crear usuario en backend con reintentos para asegurar persistencia
      await api.post<User>(`/api/usuarios/${firebaseUser.uid}`, newUserProfile);
      
      // Esperar un momento para asegurar que Firestore ha confirmado la escritura
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setUser(newUserProfile);
      setAllUsersInMemory(prev => [...prev, newUserProfile]);
      setLoading(false);
      
      router.push('/onboarding'); 

    } catch (error: any) {
      setLoading(false);
      throw new Error(error.message);
    }
  };

  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      // CRÍTICO: Verificar PRIMERO si la cuenta está bloqueada (OBLIGATORIO)
      // Esta verificación DEBE ocurrir ANTES de intentar login con Firebase
      let userCheck: User | null = null;
      try {
        console.log("🔒 Verificando estado de bloqueo ANTES del login...");
        userCheck = await api.get<User>(`/api/usuarios/email/${encodeURIComponent(email)}`);
        console.log("Estado del usuario obtenido:", { 
          email: userCheck.email, 
          isBlocked: userCheck.isBlocked,
          loginAttempts: userCheck.loginAttempts 
        });
        
        // CRÍTICO: Si isBlocked es true, NO permitir el login
        if (userCheck.isBlocked) {
          console.log("🚫 Cuenta bloqueada detectada ANTES del login - DENEGANDO ACCESO");
          setLoading(false);
          throw new Error("Tu cuenta ha sido bloqueada por demasiados intentos fallidos. Por favor, reporta este bloqueo a juandi23154@gmail.com para recibir asistencia.");
        }
        console.log("✓ Cuenta NO bloqueada - continuando con login...");
      } catch (checkError: any) {
        console.log("Error al verificar usuario:", {
          status: checkError.status,
          message: checkError.message,
          data: checkError.data
        });
        
        // Si el backend devuelve 403 (FORBIDDEN), significa que la cuenta está bloqueada
        if (checkError.status === 403) {
          console.log("🚫 Backend devolvió 403 FORBIDDEN - cuenta bloqueada");
          setLoading(false);
          const errorMessage = checkError.data?.message || checkError.message || "Tu cuenta ha sido bloqueada por demasiados intentos fallidos. Por favor, reporta este bloqueo a juandi23154@gmail.com para recibir asistencia.";
          throw new Error(errorMessage);
        }
        
        // Si el error es porque la cuenta está bloqueada (mensaje contiene "bloqueada"), propagar el error
        if (checkError.message?.includes("bloqueada") || checkError.data?.message?.includes("bloqueada")) {
          console.log("🚫 Mensaje de bloqueo detectado en el error");
          setLoading(false);
          throw checkError;
        }
        
        // Si el usuario no existe en el backend, continuar (usuario nuevo)
        if (checkError.status === 404 || checkError.message?.includes("no encontrado")) {
          console.log("Usuario no encontrado en backend (404), continuando con login...");
        } else {
          // Si hay otro error (red, etc.), NO permitir el login por seguridad
          console.error("❌ Error al verificar estado de bloqueo:", checkError);
          setLoading(false);
          throw new Error("No se pudo verificar el estado de la cuenta. Por favor, intenta nuevamente.");
        }
      }

      // Intentar login con Firebase
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      
      // CRÍTICO: Verificar OBLIGATORIAMENTE DESPUÉS del login si la cuenta está bloqueada
      // Si no se puede verificar, hacer logout por seguridad
      try {
        console.log("🔒 Verificando estado de bloqueo DESPUÉS del login...");
        const userCheckAfter = await api.get<User>(`/api/usuarios/email/${encodeURIComponent(email)}`);
        console.log("Estado del usuario después del login:", {
          email: userCheckAfter.email,
          isBlocked: userCheckAfter.isBlocked,
          loginAttempts: userCheckAfter.loginAttempts
        });
        
        if (userCheckAfter.isBlocked) {
          // Si está bloqueado, hacer logout inmediatamente
          console.log("🚫 Cuenta bloqueada detectada DESPUÉS del login - haciendo logout inmediatamente");
          await signOut(auth);
          setLoading(false);
          throw new Error("Tu cuenta ha sido bloqueada por demasiados intentos fallidos. Por favor, reporta este bloqueo a juandi23154@gmail.com para recibir asistencia.");
        }
        console.log("✓ Cuenta NO bloqueada después del login - continuando...");
      } catch (checkAfterError: any) {
        console.log("Error al verificar usuario después del login:", {
          status: checkAfterError.status,
          message: checkAfterError.message,
          data: checkAfterError.data
        });
        
        // Si el backend devuelve 403 (FORBIDDEN), significa que la cuenta está bloqueada
        if (checkAfterError.status === 403) {
          console.log("🚫 Backend devolvió 403 FORBIDDEN después del login - cuenta bloqueada");
          await signOut(auth);
          setLoading(false);
          const errorMessage = checkAfterError.data?.message || checkAfterError.message || "Tu cuenta ha sido bloqueada por demasiados intentos fallidos. Por favor, reporta este bloqueo a juandi23154@gmail.com para recibir asistencia.";
          throw new Error(errorMessage);
        }
        
        // Si el error es porque la cuenta está bloqueada (mensaje contiene "bloqueada"), propagar el error
        if (checkAfterError.message?.includes("bloqueada") || checkAfterError.data?.message?.includes("bloqueada")) {
          console.log("🚫 Mensaje de bloqueo detectado después del login");
          await signOut(auth);
          setLoading(false);
          throw checkAfterError;
        }
        
        // Si no se puede verificar (error de red, etc.), hacer logout por seguridad
        console.error("❌ No se pudo verificar bloqueo después del login - haciendo logout por seguridad:", checkAfterError);
        await signOut(auth);
        setLoading(false);
        throw new Error("No se pudo verificar el estado de la cuenta. Por seguridad, se cerró la sesión.");
      }
      
      // onAuthStateChanged se encargará de establecer el usuario y la redirección
      setLoading(false);
    } catch (error: any) {
      setLoading(false);
      
      // Si el error es de credenciales incorrectas, incrementar intentos
      if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        try {
          // PRIMERO: Obtener el estado ACTUAL del usuario (antes de incrementar)
          let intentosPrevios = 0;
          let estabaBloqueado = false;
          
          try {
            const userBeforeAttempt = await api.get<User>(`/api/usuarios/email/${encodeURIComponent(email)}`);
            intentosPrevios = userBeforeAttempt.loginAttempts || 0;
            estabaBloqueado = userBeforeAttempt.isBlocked || false;
            
            console.log('Estado ANTES de incrementar:', { 
              intentos: intentosPrevios, 
              bloqueado: estabaBloqueado,
              email: email
            });
            
            // Si ya estaba bloqueado, mostrar mensaje de bloqueo inmediatamente
            if (estabaBloqueado) {
              throw new Error("Tu cuenta ha sido bloqueada por demasiados intentos fallidos. Por favor, reporta este bloqueo a juandi23154@gmail.com para recibir asistencia.");
            }
          } catch (checkBeforeError: any) {
            if (checkBeforeError.message?.includes("bloqueada")) {
              throw checkBeforeError;
            }
            console.warn("No se pudo obtener estado del usuario antes de incrementar:", checkBeforeError);
          }
          
          // SEGUNDO: Incrementar intentos
          await api.post(`/api/usuarios/email/${encodeURIComponent(email)}/incrementar-intentos`);
          
          // TERCERO: Esperar un momento y obtener el estado DESPUÉS de incrementar
          await new Promise(resolve => setTimeout(resolve, 300)); // Pequeño delay para asegurar que Firestore actualizó
          
          let intentosDespues = intentosPrevios + 1;
          let bloqueadoDespues = false;
          
          try {
            const userAfterAttempt = await api.get<User>(`/api/usuarios/email/${encodeURIComponent(email)}`);
            intentosDespues = userAfterAttempt.loginAttempts || (intentosPrevios + 1);
            bloqueadoDespues = userAfterAttempt.isBlocked || false;
            
            console.log('Estado DESPUÉS de incrementar:', { 
              intentos: intentosDespues, 
              bloqueado: bloqueadoDespues,
              email: email
            });
            
            // CRÍTICO: Solo mostrar mensaje de bloqueo si isBlocked es TRUE en Firestore
            // No confiar solo en el número de intentos
            if (bloqueadoDespues) {
              // Si isBlocked es true en Firestore, definitivamente está bloqueado
              throw new Error("Tu cuenta ha sido bloqueada por demasiados intentos fallidos. Por favor, reporta este bloqueo a juandi23154@gmail.com para recibir asistencia.");
            }
          } catch (checkAfterError: any) {
            // CRÍTICO: Detectar bloqueo de múltiples formas:
            // 1. Status 403 (FORBIDDEN) - el backend devuelve esto cuando está bloqueado
            // 2. data.isBlocked === true - indica explícitamente que está bloqueado
            // 3. message o data.message contiene "bloqueada"
            const isBlocked = checkAfterError.status === 403 || 
                             checkAfterError.data?.isBlocked === true ||
                             checkAfterError.message?.includes("bloqueada") ||
                             checkAfterError.data?.message?.includes("bloqueada");
            
            if (isBlocked) {
              // Si el backend indica que está bloqueado (403 o isBlocked: true), lanzar error de bloqueo
              console.log("🚫 Cuenta bloqueada detectada DESPUÉS de incrementar intentos");
              const errorMessage = checkAfterError.data?.message || 
                                  checkAfterError.message || 
                                  "Tu cuenta ha sido bloqueada por demasiados intentos fallidos. Por favor, reporta este bloqueo a juandi23154@gmail.com para recibir asistencia.";
              throw new Error(errorMessage);
            }
            
            // Si no es un error de bloqueo, continuar normalmente
            console.warn("No se pudo obtener estado del usuario después de incrementar:", checkAfterError);
            // Usar el valor calculado (previo + 1) si no se puede obtener
            intentosDespues = intentosPrevios + 1;
          }
          
          // CRÍTICO: Solo mostrar mensaje de bloqueo si isBlocked es TRUE en Firestore
          // NO usar throw new Error() para mensajes de advertencia (ej. "Te quedan 2 intentos")
          // Solo lanzar error si la cuenta está definitivamente bloqueada o hay un error grave
          if (bloqueadoDespues) {
            // Si isBlocked es true en Firestore, definitivamente está bloqueado
            throw new Error("Tu cuenta ha sido bloqueada por demasiados intentos fallidos. Por favor, reporta este bloqueo a juandi23154@gmail.com para recibir asistencia.");
          }
          
          // Si llega aquí, significa que la contraseña fue incorrecta y el intento se incrementó,
          // pero la cuenta aún NO está bloqueada.
          // 👇 CORRECCIÓN CLAVE: Lanzar un error GENÉRICO si las credenciales fallan 
          // y la cuenta NO está bloqueada. NO mencionar el bloqueo en el mensaje.
          // El mensaje de advertencia (ej. "Te quedan 2 intentos") debe manejarse a nivel de UI (AuthForm).
          throw new Error("Credenciales incorrectas. Por favor, revisa tu correo y contraseña.");
          
        } catch (e: any) {
          // 🚨 CORRECCIÓN CRÍTICA: Simplemente relanzamos CUALQUIER error que ocurrió
          // Esto incluye el error de transacción fallida del Backend O el error de bloqueo del Frontend.
          // Ya no intentamos "cubrir" un error con otro.
          
          // Determinar si es un error esperado (credenciales incorrectas) o un error real del sistema
          const isExpectedError = e?.message?.includes("Credenciales incorrectas") || 
                                 e?.message?.includes("bloqueada");
          
          if (isExpectedError) {
            // Error esperado: solo logear en modo debug, no como error fatal
            console.log("ℹ️ Error esperado durante el flujo de incremento de intentos:", e.message);
          } else {
            // Error real del sistema: logear como error crítico
            console.error("❌ Error FATAL durante el flujo de incremento de intentos:", e);
            console.error("  - Tipo:", e?.constructor?.name || typeof e);
            console.error("  - Mensaje:", e?.message);
            console.error("  - Status:", e?.status);
            console.error("  - Data:", e?.data);
            console.error("  - Stack:", e?.stack);
          }
          
          // La única excepción: si el error viene de la verificación de estado ANTES o DESPUÉS del incremento
          // y ya lleva el mensaje de bloqueo, lanzarlo directamente.
          if (e.message?.includes("bloqueada") || e.data?.message?.includes("bloqueada")) {
            throw e;
          }
          
          // CRÍTICO: Si el error viene del backend (transacción fallida, etc.), NO cubrirlo con mensaje genérico
          // Solo cubrir con mensaje genérico si es un error de usuario no encontrado o similar
          if (e.message?.includes("no encontrado") || e.status === 400) {
            console.warn("Usuario no encontrado al incrementar intentos - usando mensaje genérico");
            // 🛑 CORRECCIÓN CLAVE: No mencionar el bloqueo en el mensaje genérico
            throw new Error("Credenciales incorrectas. Por favor, revisa tu correo y contraseña.");
          }
          
          // Si la transacción falló, el error de `api.post` será una excepción. 
          // Para errores del backend (500, etc.), lanzar el error original para que sea visible
          // Solo cubrir con mensaje genérico si NO hay información útil del error
          if (e.status >= 500 || e.status === 0) {
            // Error del servidor o de red - propagar para que sea visible
            console.error("❌ Error del servidor/transacción detectado - propagando error:", e);
            throw new Error(`Error del servidor al procesar el intento de login: ${e.message || 'Error desconocido'}`);
          }
          
          // Si tiene mensaje útil, lanzarlo directamente (no cubrirlo)
          if (e.message && !e.message.includes("Credenciales incorrectas")) {
            throw e;
          }
          
          // Fallback: mensaje genérico solo si realmente no hay información útil
          // NO mencionar el bloqueo en el mensaje genérico
          throw new Error("Credenciales incorrectas. Por favor, revisa tu correo y contraseña.");
        }
      }
      
      // Si no fue error de credenciales/bloqueo, verificar si es error de Firebase conocido
      // auth/user-not-found también debe mostrarse como credenciales incorrectas por seguridad
      if (error.code === 'auth/user-not-found') {
        throw new Error("Credenciales incorrectas. Por favor, revisa tu correo y contraseña.");
      }
      
      // Para cualquier otro error de Firebase o desconocido, propagar el mensaje original
      throw new Error(error.message);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await signOut(auth);
      setUser(null);
      setAllUsersInMemory([]);
      setUnreadMessagesCount(0);
      if (unreadCountIntervalRef.current) {
        clearInterval(unreadCountIntervalRef.current);
        unreadCountIntervalRef.current = null;
      }
      router.push('/login');
    } catch (error: any) {
      setLoading(false);
      throw new Error(error.message);
    }
  };

  const updateUserAvatar = async (avatarUrl: string) => {
    if (!user) throw new Error("Usuario no autenticado.");
    try {
      const updated = await api.put<User>(`/api/usuarios/${user.id}`, { avatarUrl });
      setUser(prev => prev ? { ...prev, avatarUrl: updated.avatarUrl } : null);
      setAllUsersInMemory(prev => prev.map(u => u.id === user.id ? { ...u, avatarUrl: updated.avatarUrl } : u));
    } catch (error: any) {
      throw new Error(`Error al actualizar avatar: ${error.message}`);
    }
  };

  const updateUserProfile = async (data: Partial<User>) => {
    if (!user) throw new Error("Usuario no autenticado.");
    try {
      const updated = await api.put<User>(`/api/usuarios/${user.id}`, data);
      setUser(prev => prev ? { ...prev, ...updated } : null);
      setAllUsersInMemory(prev => prev.map(u => u.id === user.id ? { ...u, ...updated } : u));
    } catch (error: any) {
      throw new Error(`Error al actualizar perfil: ${error.message}`);
    }
  };

  const completeOnboarding = async (data: { hobbies: string[]; bioSoundUrl: string; avatarUrl: string; }) => {
    if (!user) throw new Error("Usuario no autenticado.");
    try {
      await api.post<User>(`/api/usuarios/${user.id}/onboarding`, data);
      // Forzar refresh desde backend para garantizar sincronización de onboardingComplete
      const freshUser = await api.get<User>(`/api/usuarios/${user.id}`);
      setUser(freshUser);
      setAllUsersInMemory(prev => prev.map(u => u.id === user.id ? freshUser : u));
      router.push('/profile');
    } catch (error: any) {
      throw new Error(`Error al completar onboarding: ${error.message}`);
    }
  };

  const getUserById = async (id: string): Promise<User | undefined> => {
    try {
      const userData = await api.get<User>(`/api/usuarios/${id}`);
      return userData;
    } catch (error: any) {
      console.error(`Error fetching user ${id} from API:`, error.message);
      // Si el error es 404, el usuario no existe
      if (error.status === 404 || error.message?.includes('404') || error.message?.includes('not found') || error.message?.includes('no encontrado')) {
        return undefined;
      }
      // Para otros errores, intentar con reintentos
      try {
        await new Promise(resolve => setTimeout(resolve, 500));
        const retryData = await api.get<User>(`/api/usuarios/${id}`);
        return retryData;
      } catch (retryError: any) {
        // Si el reintento también falla con 404, el usuario no existe
        if (retryError.status === 404 || retryError.message?.includes('404') || retryError.message?.includes('not found')) {
          return undefined;
        }
        return undefined;
      }
    }
  };

  const isFollowing = (userIdToCheck: string): boolean => {
    if (!user || !user.following) return false;
    return user.following.includes(userIdToCheck);
  };

  const followUser = async (userIdToFollow: string) => {
    if (!user || !user.following) throw new Error("Usuario no autenticado o siguiendo no inicializado.");
    if (isFollowing(userIdToFollow)) return;
    try {
      await api.post(`/api/usuarios/${user.id}/seguir/${userIdToFollow}`);
      const me = await api.get<User>(`/api/usuarios/${user.id}`);
      const other = await api.get<User>(`/api/usuarios/${userIdToFollow}`);
      setUser(me);
      setAllUsersInMemory(prev => {
        const map = new Map(prev.map(u => [u.id, u] as const));
        map.set(me.id, me);
        map.set(other.id, other);
        return Array.from(map.values());
      });
    } catch (error: any) {
      throw new Error(`Error al seguir usuario: ${error.message}`);
    }
  };

  const unfollowUser = async (userIdToUnfollow: string) => {
    if (!user || !user.following) throw new Error("Usuario no autenticado o siguiendo no inicializado.");
    if (!isFollowing(userIdToUnfollow)) return;
    try {
      await api.delete(`/api/usuarios/${user.id}/seguir/${userIdToUnfollow}`);
      const me = await api.get<User>(`/api/usuarios/${user.id}`);
      const other = await api.get<User>(`/api/usuarios/${userIdToUnfollow}`);
      setUser(me);
      setAllUsersInMemory(prev => {
        const map = new Map(prev.map(u => [u.id, u] as const));
        map.set(me.id, me);
        map.set(other.id, other);
        return Array.from(map.values());
      });
    } catch (error: any) {
      throw new Error(`Error al dejar de seguir usuario: ${error.message}`);
    }
  };

  const getMutualFollows = (): User[] => {
    // Mantener sincrónico por API: devolver últimos calculados en memoria si existen
    // Para obtener datos frescos, se recomienda crear un hook que haga fetch al endpoint
    if (!user) return [];
    // Este cálculo local sirve como fallback
    if (!user.following || !user.followers) return [];
    return allUsersInMemory.filter(otherUser => {
      if (otherUser.id === user.id) return false;
      const currentUserFollowsOther = user.following?.includes(otherUser.id);
      const otherUserFollowsCurrent = otherUser.following?.includes(user.id);
      return currentUserFollowsOther && otherUserFollowsCurrent;
    });
  };

  const getDirectMessages = (chatPartnerId: string): Message[] => {
    // Devuelve cache; para obtener datos frescos del backend, usar fetchDirectMessages
    if (!user) return [];
    const chatId = [user.id, chatPartnerId].sort().join('_');
    return directMessagesInMemory
      .filter(msg => msg.chatId === chatId)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  };

  const fetchDirectMessages = async (chatPartnerId: string): Promise<Message[]> => {
    // Cargar mensajes desde el backend (Firestore)
    if (!user) return [];
    try {
      const messages = await api.get<Message[]>(`/api/mensajes/chat/${user.id}/${chatPartnerId}`);
      // Actualizar memoria local con los mensajes del backend
      setDirectMessagesInMemory(prev => {
        const map = new Map(prev.map(m => [m.id, m]));
        messages.forEach(msg => map.set(msg.id, msg));
        const updated = Array.from(map.values());
        // Actualizar contador global de mensajes sin leer
        const unread = updated.filter(msg => msg.recipientId === user.id && !msg.isRead).length;
        setUnreadMessagesCount(unread);
        return updated;
      });
      return messages.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    } catch (error: any) {
      console.error('Error al cargar mensajes del backend:', error);
      // Fallback a mensajes en memoria
      return getDirectMessages(chatPartnerId);
    }
  };

  const sendDirectMessage = async (recipientId: string, voiceDataUri: string): Promise<void> => {
    if (!user) throw new Error("Usuario no autenticado.");
    try {
      const msg = await api.post<Message>(`/api/mensajes/enviar/${user.id}`, { recipientId, voiceUrl: voiceDataUri });
      setDirectMessagesInMemory(prev => [...prev, msg]);
      // Si el mensaje es para el usuario actual, actualizar contador (aunque no debería ser común)
      if (recipientId === user.id) {
        updateUnreadCount();
      }
    } catch (error: any) {
      throw new Error(`Error al enviar mensaje: ${error.message}`);
    }
  };

  const getUnreadMessagesCount = async (): Promise<number> => {
    if (!user) return unreadMessagesCount;
    // Usar contador global si está disponible
    if (unreadMessagesCount >= 0) {
      return unreadMessagesCount;
    }
    // Fallback: calcular desde mensajes en memoria
    try {
      const unread = directMessagesInMemory.filter(msg => msg.recipientId === user.id && !msg.isRead).length;
      return unread;
    } catch (error: any) {
      console.error('Error al calcular mensajes sin leer:', error);
      return 0;
    }
  };

  // Actualizar contador global de mensajes sin leer (función auxiliar)
  const updateUnreadCount = async () => {
    if (!user?.id || unreadCountLoadingRef.current) return;
    unreadCountLoadingRef.current = true;
    try {
      const messages = await api.get<Message[]>(`/api/mensajes/no-leidos/${user.id}`);
      setUnreadMessagesCount(messages.length);
    } catch (error: any) {
      // Si falla, calcular desde mensajes en memoria
      try {
        const unread = directMessagesInMemory.filter(msg => msg.recipientId === user.id && !msg.isRead).length;
        setUnreadMessagesCount(unread);
      } catch {
        console.error('Error al obtener mensajes sin leer:', error);
      }
    } finally {
      unreadCountLoadingRef.current = false;
    }
  };

  const getUnreadMessagesCountForChat = async (chatPartnerId: string): Promise<number> => {
    if (!user) return 0;
    try {
      const messages = await fetchDirectMessages(chatPartnerId);
      return messages.filter(msg => msg.recipientId === user.id && !msg.isRead).length;
    } catch (error: any) {
      console.error('Error al obtener mensajes sin leer del chat:', error);
      return 0;
    }
  };

  const markMessageAsRead = async (messageId: string): Promise<void> => {
    if (!user) return;
    try {
      await api.put(`/api/mensajes/${messageId}/leido`, {});
      // Actualizar en memoria local
      setDirectMessagesInMemory(prev => {
        const updated = prev.map(msg => msg.id === messageId ? { ...msg, isRead: true } : msg);
        // Actualizar contador global
        const unread = updated.filter(msg => msg.recipientId === user.id && !msg.isRead).length;
        setUnreadMessagesCount(unread);
        return updated;
      });
    } catch (error: any) {
      console.error('Error al marcar mensaje como leído:', error);
    }
  };

  const markChatAsRead = async (chatPartnerId: string): Promise<void> => {
    if (!user) return;
    try {
      const messages = await fetchDirectMessages(chatPartnerId);
      const unreadMessages = messages.filter(msg => msg.recipientId === user.id && !msg.isRead);
      // Marcar todos los mensajes sin leer del chat como leídos
      await Promise.all(unreadMessages.map(msg => markMessageAsRead(msg.id)));
      // Actualizar contador global
      await updateUnreadCount();
    } catch (error: any) {
      console.error('Error al marcar chat como leído:', error);
    }
  };

  // Actualizar contador global cuando cambia el usuario
  useEffect(() => {
    if (!user?.id) {
      setUnreadMessagesCount(0);
      if (unreadCountIntervalRef.current) {
        clearInterval(unreadCountIntervalRef.current);
        unreadCountIntervalRef.current = null;
      }
      return;
    }

    // Limpiar intervalo anterior si existe
    if (unreadCountIntervalRef.current) {
      clearInterval(unreadCountIntervalRef.current);
      unreadCountIntervalRef.current = null;
    }

    // Función local para evitar dependencias en el useEffect
    const loadUnreadCount = async () => {
      if (!user?.id || unreadCountLoadingRef.current) return;
      unreadCountLoadingRef.current = true;
      try {
        const messages = await api.get<Message[]>(`/api/mensajes/no-leidos/${user.id}`);
        setUnreadMessagesCount(messages.length);
      } catch (error: any) {
        // Si falla (puede ser por falta de índice en Firestore), calcular desde mensajes en memoria
        console.warn('Error al obtener mensajes sin leer del backend, usando contador local:', error);
        try {
          // Calcular desde mensajes en memoria local
          const currentMessages = directMessagesInMemory;
          const unread = currentMessages.filter(msg => msg.recipientId === user.id && !msg.isRead).length;
          setUnreadMessagesCount(unread);
        } catch (calcError) {
          console.error('Error al calcular mensajes sin leer desde memoria:', calcError);
          // Si todo falla, mantener el contador actual (no actualizar)
        }
      } finally {
        unreadCountLoadingRef.current = false;
      }
    };

    // Cargar contador inicial
    loadUnreadCount();

    // Actualizar cada 60 segundos (reducido de 30 para evitar saturación)
    unreadCountIntervalRef.current = setInterval(() => {
      loadUnreadCount();
    }, 60000);

    return () => {
      if (unreadCountIntervalRef.current) {
        clearInterval(unreadCountIntervalRef.current);
        unreadCountIntervalRef.current = null;
      }
    };
  }, [user?.id]); // Solo depender de user.id

  const contextValue: AuthContextType = {
    user,
    loading,
    login,
    signup,
    logout,
    updateUserAvatar,
    updateUserProfile,
    completeOnboarding, // ¡NUEVO!
    followUser,
    unfollowUser,
    isFollowing,
    getUserById,
    getMutualFollows,
    getDirectMessages,
    fetchDirectMessages,
    sendDirectMessage,
    getUnreadMessagesCount,
    getUnreadMessagesCountForChat,
    markMessageAsRead,
    markChatAsRead,
    unreadMessagesCount,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
