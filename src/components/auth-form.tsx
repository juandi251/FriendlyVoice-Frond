// src/components/auth-form.tsx
// Componente genérico para formularios de Login y Registro.

"use client";

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription, // Importar FormDescription
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/auth-context';
import { Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { AccountLockedDialog } from '@/components/account-locked-dialog';
import { useState } from 'react';

// Esquema base para email y contraseña
const formSchemaBase = z.object({
  email: z.string().email({ message: 'Dirección de correo electrónico inválida.' }),
  password: z.string().min(6, { message: 'La contraseña debe tener al menos 6 caracteres.' }),
});

// Esquema para registro (extiende el base y añade nombre, confirmación de contraseña y fecha de nacimiento)
const signupSchema = formSchemaBase.extend({
  name: z.string().min(2, { message: 'El nombre debe tener al menos 2 caracteres.' }).max(50, { message: "El nombre no debe exceder los 50 caracteres." }),
  confirmPassword: z.string().min(6, { message: 'Por favor, confirma tu contraseña.' }),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { message: "Formato de fecha inválido (YYYY-MM-DD)." })
    .refine((dob) => {
      const birthDate = new Date(dob);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const m = today.getMonth() - birthDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      return age >= 13; // Requiere al menos 13 años
    }, {
      message: 'Debes tener al menos 13 años para registrarte.',
      path: ['dateOfBirth'],
    }),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Las contraseñas no coinciden.',
  path: ['confirmPassword'],
});

type AuthFormProps = {
  type: 'login' | 'signup';
};

export function AuthForm({ type }: AuthFormProps) {
  const { login, signup, loading: authLoading } = useAuth(); 
  const { toast } = useToast();
  const router = useRouter();
  const [showLockedDialog, setShowLockedDialog] = useState(false);

  const currentSchema = type === 'signup' ? signupSchema : formSchemaBase;

  const form = useForm<z.infer<typeof currentSchema>>({
    resolver: zodResolver(currentSchema),
    defaultValues: {
      email: '',
      password: '',
      ...(type === 'signup' && { name: '', confirmPassword: '', dateOfBirth: '' }), // Valores por defecto para nuevos campos
    },
  });

  async function onSubmit(values: z.infer<typeof currentSchema>) {
    try {
      if (type === 'login') {
        await login(values.email, values.password); 
        toast({ title: 'Inicio de Sesión Exitoso', description: '¡Bienvenido de nuevo!' });
      } else if (type === 'signup') {
        const signupValues = values as z.infer<typeof signupSchema>;
        // Llama a la función signup de useAuth con email, contraseña, nombre y fecha de nacimiento
        await signup(signupValues.email, signupValues.password, signupValues.name, signupValues.dateOfBirth); 
        toast({ 
          title: 'Registro Exitoso', 
          description: 'Tu cuenta ha sido creada. ¡Por favor, verifica tu correo electrónico!' 
        });
        // La redirección a /verify-email ya se maneja en el AuthContext
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Ocurrió un error inesperado.';
      
      // Detectar si es un error esperado (credenciales incorrectas normales) vs error del sistema
      const isExpectedError = errorMessage.includes('Credenciales incorrectas') && 
                             !errorMessage.includes('bloqueada');
      
      if (isExpectedError) {
        // Error esperado: logear como información, no como error
        console.log("ℹ️ Error esperado en AuthForm onSubmit:", errorMessage);
      } else {
        // Error real del sistema o bloqueo: logear como error
        console.error("❌ Error en AuthForm onSubmit:", errorMessage);
      }
      
      // Detectar si es un error de cuenta bloqueada
      if (errorMessage.includes('bloqueada') || errorMessage.includes('bloqueado')) {
        setShowLockedDialog(true);
        return;
      }
      
      toast({
        title: type === 'login' ? 'Error al Iniciar Sesión' : 'Error en el Registro',
        description: errorMessage,
        variant: 'destructive',
      });
    }
  }

  return (
    <>
      <AccountLockedDialog 
        open={showLockedDialog} 
        onClose={() => setShowLockedDialog(false)} 
      />
      <div className="max-w-md mx-auto">
        <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {type === 'signup' && (
            <>
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre</FormLabel>
                    <FormControl>
                      <Input placeholder="Tu Nombre" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="dateOfBirth"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fecha de Nacimiento</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormDescription>Debes tener al menos 13 años.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </>
          )}
            <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Correo Electrónico</FormLabel>
                <FormControl>
                  <Input type="email" placeholder="tu@ejemplo.com" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Contraseña</FormLabel>
                <FormControl>
                  <Input type="password" placeholder="••••••••" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          {type === 'signup' && (
            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirmar Contraseña</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="••••••••" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
          <Button type="submit" className="w-full" disabled={authLoading}>
            {authLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {type === 'login' ? 'Iniciar Sesión' : 'Registrarse'}
          </Button>
        </form>
      </Form>
      <p className="mt-6 text-center text-sm text-muted-foreground">
        {type === 'login' ? "¿No tienes una cuenta? " : '¿Ya tienes una cuenta? '}
        <Link href={type === 'login' ? '/register' : '/login'} className="font-medium text-primary hover:underline">
          {type === 'login' ? 'Registrarse' : 'Iniciar Sesión'}
        </Link>
      </p>
    </div>
    </>
  );
}
