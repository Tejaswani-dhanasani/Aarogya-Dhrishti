import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { UserPlus, AlertCircle, Loader2 } from 'lucide-react';
import api, { errMsg } from '../api.js';
import { useRoles } from '../hooks.js';
import { useLang } from '../lang.jsx';
import AuthShell from '../components/AuthShell.jsx';
import RoleSelector from '../components/RoleSelector.jsx';
import StaffNotice from '../components/StaffNotice.jsx';

// Main registration page: Health Workers register here.
// Higher-level staff roles are sent to the Staff Portal.
export default function Register() {
  const { roles, error: loadError } = useRoles();
  const { t, lang } = useLang();
  const navigate = useNavigate();
  const [role, setRole] = useState('HEALTH_WORKER');
  const [error, setError] = useState('');
  const { register, handleSubmit, reset, watch, formState: { errors, isSubmitting } } = useForm();
  const isStaff = role !== 'HEALTH_WORKER';

  // The form is rebuilt whenever the profession changes
  useEffect(() => { reset(); setError(''); }, [role, reset]);

  const onSubmit = async (data) => {
    setError('');
    try {
      await api.post('/auth/register', { ...data, role });
      navigate('/login', { state: { registered: true, role } });
    } catch (e) { setError(errMsg(e)); }
  };

  return (
    <AuthShell wide>
      <div className="card p-7 shadow-lg sm:p-8">
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-primary-100 text-primary-700"><UserPlus /></span>
        <h1 className="mt-4 text-2xl font-bold">{t('registerTitle')}</h1>
        <p className="mt-1 text-sm text-neutral-500">{t('registerSub')}</p>
        {loadError && <p className="mt-4 flex items-center gap-2 rounded-xl bg-error-50 p-3 text-sm text-error-700"><AlertCircle size={16} />{loadError}</p>}
        {!roles && !loadError && <p className="mt-6 flex items-center gap-2 text-sm text-neutral-500"><Loader2 className="animate-spin" size={16} />Loading…</p>}
        {roles && (
          <>
            <p className="label mt-6">{t('selectRole')}</p>
            <RoleSelector roles={roles} value={role} onChange={setRole} />

            {isStaff ? <StaffNotice mode="register" roleName={role} /> : (
              <form key={role} onSubmit={handleSubmit(onSubmit)} className="mt-6 grid gap-4 sm:grid-cols-2" noValidate>
                {roles[role].fields.map((f) => (
                  <div key={f.name}>
                    <label className="label">{lang === 'te' ? f.te : f.label}</label>
                    {f.type === 'select' ? (
                      <select className="input" defaultValue="" {...register(f.name, { required: 'Required' })}>
                        <option value="" disabled>Select…</option>
                        {f.options.map((o) => <option key={o}>{o}</option>)}
                      </select>
                    ) : (
                      <input className="input" type={f.type} inputMode={f.type === 'tel' ? 'numeric' : undefined}
                        maxLength={f.type === 'tel' ? 10 : undefined}
                        autoComplete={f.type === 'password' ? 'new-password' : 'off'}
                        {...register(f.name, {
                          required: 'Required',
                          ...(f.type === 'tel' && { pattern: { value: /^\d{10}$/, message: '10 digits' } }),
                          ...(f.type === 'email' && { pattern: { value: /^[^@\s]+@[^@\s]+\.[^@\s]+$/, message: 'Invalid email' } }),
                          ...(f.name === 'password' && { minLength: { value: 6, message: 'Min 6 characters' } }),
                          ...(f.name === 'confirm' && { validate: (v) => v === watch('password') || 'Passwords do not match' }),
                        })} />
                    )}
                    {errors[f.name] && <p className="mt-1 text-xs text-error-600">{errors[f.name].message}</p>}
                  </div>
                ))}
                {error && <p className="flex items-center gap-2 rounded-xl bg-error-50 p-3 text-sm text-error-700 sm:col-span-2"><AlertCircle size={16} />{error}</p>}
                <div className="sm:col-span-2">
                  <button className="btn w-full py-3" disabled={isSubmitting}>{isSubmitting && <Loader2 className="animate-spin" size={16} />}{t('register')}</button>
                </div>
              </form>
            )}
            <p className="mt-5 text-center text-sm text-neutral-600">{t('haveAccount')} <Link to="/login" className="font-semibold text-primary-700 hover:underline">{t('login')}</Link></p>
          </>
        )}
      </div>
    </AuthShell>
  );
}
