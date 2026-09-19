import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../components/Toast';

/**
 * OAuthCallbackPage — handles the redirect from the backend after
 * Google / GitHub OAuth. The backend appends ?token=<jwt> to the URL.
 * This page reads it, stores it via AuthContext, then navigates away.
 */
export function OAuthCallbackPage() {
  const { login } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [params] = useSearchParams();

  useEffect(() => {
    const token = params.get('token');
    const error = params.get('error');

    if (error) {
      const messages: Record<string, string> = {
        invalid_state:         'Security check failed. Please try again.',
        no_code:               'No authorisation code received. Please try again.',
        token_exchange_failed: 'Could not exchange token. Please try again.',
        profile_fetch_failed:  'Could not retrieve your profile. Please try again.',
        db_error:              'A database error occurred. Please try again.',
        no_email:              'No email found on your account. Please add a public email to your GitHub profile.',
      };
      toast(messages[error] || 'OAuth sign-in failed.', 'error');
      navigate('/login', { replace: true });
      return;
    }

    if (!token) {
      toast('No token received. Please try again.', 'error');
      navigate('/login', { replace: true });
      return;
    }

    // Decode the JWT payload to pull out user info (no library needed)
    try {
      const payloadB64 = token.split('.')[1];
      const payload = JSON.parse(atob(payloadB64.replace(/-/g, '+').replace(/_/g, '/')));

      const user = {
        id:         payload.sub || payload.user_id || '',
        username:   payload.username || payload.name || 'User',
        email:      payload.email || '',
        created_at: new Date().toISOString(),
      };

      login(token, user);
      toast(`Welcome, ${user.username}! 🎉`, 'success');
      navigate('/dashboard', { replace: true });
    } catch {
      toast('Failed to process sign-in token. Please try again.', 'error');
      navigate('/login', { replace: true });
    }
  }, []);

  return (
    <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 rounded-full border-4 border-violet-500/30 border-t-violet-500 animate-spin" />
        <p className="text-slate-400 text-sm font-mono">Completing sign-in…</p>
      </div>
    </div>
  );
}
