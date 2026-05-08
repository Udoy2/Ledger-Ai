'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === 'string' ? value.trim() : '';
}

function authErrorParam(message: string) {
  const lower = message.toLowerCase();

  if (lower.includes('email rate limit')) {
    return 'rate-limit';
  }

  if (lower.includes('email address') && lower.includes('invalid')) {
    return 'invalid-email';
  }

  return encodeURIComponent(message);
}

export async function signUpAction(formData: FormData) {
  const email = getString(formData, 'email');
  const password = getString(formData, 'password');
  const businessName = getString(formData, 'businessName');

  if (!email || !password || !businessName) {
    redirect('/auth/signup?error=missing');
  }

  const supabase = createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { business_name: businessName },
    },
  });

  if (error || !data.user) {
    redirect(`/auth/signup?error=${authErrorParam(error?.message ?? 'Could not create account')}`);
  }

  if (!data.session) {
    redirect('/auth/login?message=check-email');
  }

  redirect('/dashboard');
}

export async function loginAction(formData: FormData) {
  const email = getString(formData, 'email');
  const password = getString(formData, 'password');

  const supabase = createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    redirect(`/auth/login?error=${encodeURIComponent(error.message)}`);
  }

  redirect('/dashboard');
}

export async function logoutAction() {
  const supabase = createClient();
  await supabase.auth.signOut();
  redirect('/');
}
