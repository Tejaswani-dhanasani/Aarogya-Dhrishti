import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { LogIn, Eye, EyeOff, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import api, { errMsg } from '../api.js';
import { useAuth } from '../auth.jsx';
import { useRoles } from '../hooks.js';
import { useLang } from '../lang.jsx';
import AuthShell from '../components/AuthShell.jsx';
import { SLUG_TO_ROLE } from '../portal/roles.js';

export default function Login() {
  const { roles, error: loadError } = useRoles();
  const { t, lang } = useLang();
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { role: roleSlug } = useParams();
  const initialRole = SLUG_TO_ROLE[roleSlug] || location.state?.role || 'HEALTH_WORKER';
  const [role, setRole] = useState(initialRole === 'SUPER_ADMIN' ? 'HEALTH_WORKER' : initialRole);
  const [form, setForm] = useState(() => ({
    user_code: location.state?.generatedUserCode || '',
    password: ''
  }));
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (roleSlug) setRole(SLUG_TO_ROLE[roleSlug] || 'HEALTH_WORKER');
  }, [roleSlug]);

  const submit = async (e) => {
    e.preventDefault();
    setError(''); setBusy(true);
    try {
      const endpoint = role === 'HEALTH_WORKER' ? '/auth/login' : '/auth/staff/login';
      const { data } = await api.post(endpoint, { role, ...form });
      login(data);
      navigate('/dashboard');
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setBusy(false);
    }
  };
  return (
    <AuthShell>
      <div className="card p-7 shadow-lg sm:p-8">
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-primary-100 text-primary-700"><LogIn /></span>
        <h1 className="mt-4 text-2xl font-bold">{t('loginTitle')}</h1>
        <p className="mt-1 text-sm text-neutral-500">{t('loginSub')}</p>

        {location.state?.registered && (
          <p className="mt-4 rounded-xl bg-success-50 p-3 text-sm text-success-800" role="status">
            <span className="flex items-center gap-2"><CheckCircle2 size={16} />{lang === 'te' ? 'నమోదు విజయవంతం. మీ ఆటోమేటిక్ లాగిన్ ఐడి:' : 'Registration successful. Your automatically generated login ID is:'}</span>
            <strong className="mt-1 block font-mono text-base">{location.state.generatedUserCode}</strong>
            <span className="mt-1 block">{lang === 'te' ? 'ఈ ఐడిని భద్రపరచండి; ఇది లాగిన్ చేయడానికి అవసరం.' : 'Save this ID; you will need it to sign in.'}</span>
          </p>
        )}
        {loadError && <p className="mt-4 flex items-center gap-2 rounded-xl bg-error-50 p-3 text-sm text-error-700"><AlertCircle size={16} />{loadError}</p>}
        {!roles && !loadError && <p className="mt-6 flex items-center gap-2 text-sm text-neutral-500"><Loader2 className="animate-spin" size={16} />Loading…</p>}

        {roles && (
          <>
            <form onSubmit={submit} className="mt-6 space-y-5">
              <div>
                <label className="label" htmlFor="login-role">{t('selectRole')}</label>
                <select
                  id="login-role"
                  className="input"
                  value={role}
                  onChange={(event) => {
                    setRole(event.target.value);
                    setForm({ user_code: '', password: '' });
                    setError('');
                  }}
                >
                  {Object.entries(roles)
                    .filter(([key]) => key !== 'SUPER_ADMIN')
                    .map(([key, value]) => (
                      <option key={key} value={key}>{lang === 'te' ? value.te : value.label}</option>
                    ))}
                </select>
              </div>
              <div>
                <label className="label" htmlFor="uc">{lang === 'te' ? roles[role].idTe : roles[role].idLabel}</label>
                <input id="uc" className="input" required autoComplete="username" value={form.user_code} onChange={(e) => setForm({ ...form, user_code: e.target.value })} />
              </div>
              <div>
                <label className="label" htmlFor="pw">{t('password')}</label>
                <div className="relative">
                  <input id="pw" className="input pr-11" type={show ? 'text' : 'password'} required autoComplete="current-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
                  <button type="button" onClick={() => setShow(!show)} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-neutral-400 hover:text-neutral-700" aria-label="Show password">{show ? <EyeOff size={18} /> : <Eye size={18} />}</button>
                </div>
              </div>
              {error && <p className="flex items-center gap-2 rounded-xl bg-error-50 p-3 text-sm text-error-700"><AlertCircle size={16} />{error}</p>}
              <button className="btn w-full py-3" disabled={busy}>{busy && <Loader2 className="animate-spin" size={16} />}{t('login')}</button>
            </form>
            <p className="mt-5 text-center text-sm text-neutral-600">{t('noAccount')} <Link to="/register" className="font-semibold text-primary-700 hover:underline">{t('register')}</Link></p>
          </>
        )}
      </div>
    </AuthShell>
  );
}
