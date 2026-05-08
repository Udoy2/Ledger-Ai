import { AuthForm } from '@/components/AuthForm';
import { signUpAction } from '@/app/auth/actions';

export default function SignupPage({ searchParams }: { searchParams: { error?: string } }) {
  const error =
    searchParams.error === 'rate-limit'
      ? 'Supabase email signup is temporarily rate-limited. Wait a bit, disable email confirmations for MVP testing, or configure custom SMTP.'
      : searchParams.error === 'invalid-email'
        ? 'Use a real email domain for Supabase signup. Test domains like .test can be rejected.'
        : searchParams.error;

  return <AuthForm mode="signup" action={signUpAction} error={error} />;
}
