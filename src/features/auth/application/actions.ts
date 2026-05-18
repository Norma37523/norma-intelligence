'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { createSupabaseServerClient } from '@/shared/supabase/server';
import { clientEnv } from '@/shared/config/env';

import type { AuthActionState } from './types';

const credentialsSchema = z.object({
  email: z.string().email('E-mail inválido'),
  password: z.string().min(8, 'A senha deve ter no mínimo 8 caracteres'),
});

const signupSchema = credentialsSchema.extend({
  fullName: z.string().min(2, 'Informe seu nome completo'),
});

/* -------------------------------------------------------------------------- */
/* Server Actions                                                              */
/* -------------------------------------------------------------------------- */

export async function signInWithPassword(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = credentialsSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  });

  if (!parsed.success) {
    return { status: 'error', fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    return { status: 'error', message: 'E-mail ou senha incorretos.' };
  }

  const next = (formData.get('next') as string | null) ?? '/app';
  revalidatePath('/', 'layout');
  redirect(next);
}

export async function signUpWithPassword(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = signupSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
    fullName: formData.get('fullName'),
  });

  if (!parsed.success) {
    return { status: 'error', fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { full_name: parsed.data.fullName },
      emailRedirectTo: `${clientEnv.NEXT_PUBLIC_APP_URL}/callback`,
    },
  });

  if (error) {
    return { status: 'error', message: error.message };
  }

  return {
    status: 'success',
    message: 'Enviamos um e-mail de confirmação. Verifique sua caixa de entrada.',
  };
}

export async function signOut(): Promise<void> {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  revalidatePath('/', 'layout');
  redirect('/login');
}
