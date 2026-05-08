import { AuthForm } from '@/components/AuthForm';
import { loginAction } from '@/app/auth/actions';

export default function LoginPage({ searchParams }: { searchParams: { error?: string; message?: string } }) {
  const message = searchParams.message === 'check-email' ? 'Account created. Check your email to confirm, then log in.' : searchParams.error;
  return <AuthForm mode="login" action={loginAction} error={message} />;
}
