import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, CheckCircle2, Loader2, ShieldPlus, Users } from 'lucide-react';
import api, { errMsg } from '../api.js';
import { useAuth } from '../auth.jsx';
import { useRoles } from '../hooks.js';

const ROLE_LABELS = {
  DISTRICT_ADMIN: 'District Admin',
  MEDICAL_OFFICER: 'Medical Officer',
  SPECIALIST: 'Specialist',
  NAVIGATOR: 'Patient Navigator',
};

export default function OfficialAccountManager() {
  const { user } = useAuth();
  const isSuperAdmin = user.role === 'SUPER_ADMIN';
  const availableRoles = isSuperAdmin ? ['DISTRICT_ADMIN'] : ['MEDICAL_OFFICER', 'SPECIALIST', 'NAVIGATOR'];
  const [role, setRole] = useState(availableRoles[0]);
  const [formData, setFormData] = useState({});
  const [officials, setOfficials] = useState([]);
  const [loadingOfficials, setLoadingOfficials] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [success, setSuccess] = useState('');
  const [busy, setBusy] = useState(false);
  const { roles, error: rolesError } = useRoles();

  const fields = useMemo(() => roles?.[role]?.fields || [], [roles, role]);

  const loadOfficials = useCallback(async () => {
    setLoadingOfficials(true);
    setLoadError('');
    try {
      const { data } = await api.get('/admin/officials');
      setOfficials(data);
    } catch (error) {
      setLoadError(errMsg(error));
    } finally {
      setLoadingOfficials(false);
    }
  }, []);

  useEffect(() => {
    loadOfficials();
  }, [loadOfficials]);

  const updateRole = (nextRole) => {
    setRole(nextRole);
    setFormData({});
    setSubmitError('');
    setSuccess('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitError('');
    setSuccess('');
    if (formData.password !== formData.confirm) {
      setSubmitError('Passwords do not match.');
      return;
    }

    setBusy(true);
    try {
      await api.post('/admin/officials', { ...formData, role });
      setFormData({});
      setSuccess(`${ROLE_LABELS[role]} account created. They can now log in.`);
      await loadOfficials();
    } catch (error) {
      setSubmitError(errMsg(error));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-100">
      <header className="flex items-center justify-between border-b border-neutral-200 bg-white px-5 py-4 md:px-8">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-primary-700">
            {isSuperAdmin ? 'Super Admin' : 'District Admin'}
          </p>
          <h1 className="text-xl font-bold">Official account management</h1>
        </div>
        <Link to="/dashboard" className="btn-outline">Back to dashboard</Link>
      </header>

      <main className="mx-auto grid max-w-6xl gap-6 p-4 md:p-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <section className="card h-fit">
          <div className="mb-5 flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-primary-100 text-primary-700"><ShieldPlus /></span>
            <div>
              <h2 className="text-lg font-bold">Create an official account</h2>
              <p className="text-sm text-neutral-500">
                {isSuperAdmin ? 'Create District Admin accounts.' : 'Create officials assigned to your district.'}
              </p>
            </div>
          </div>

          {!roles && !rolesError && <p role="status" className="flex items-center gap-2 text-sm text-neutral-500"><Loader2 className="animate-spin" size={16} />Loading account fields…</p>}
          {rolesError && <p role="alert" className="flex items-center gap-2 rounded-xl bg-error-50 p-3 text-sm text-error-700"><AlertCircle size={16} />{rolesError}</p>}

          {roles && (
            <form onSubmit={handleSubmit} className="space-y-4">
              {!isSuperAdmin && (
                <div>
                  <label className="label" htmlFor="official-role">Official role</label>
                  <select id="official-role" className="input" value={role} onChange={(event) => updateRole(event.target.value)}>
                    {availableRoles.map((option) => <option key={option} value={option}>{ROLE_LABELS[option]}</option>)}
                  </select>
                </div>
              )}
              <div className="grid gap-4 sm:grid-cols-2">
                {fields.map((field) => (
                  <div key={field.name}>
                    <label className="label" htmlFor={`official-${field.name}`}>{field.label}</label>
                    {field.type === 'select' ? (
                      <select id={`official-${field.name}`} className="input" required value={formData[field.name] || ''}
                        onChange={(event) => setFormData((previous) => ({ ...previous, [field.name]: event.target.value }))}>
                        <option value="" disabled>Select…</option>
                        {field.options.map((option) => <option key={option} value={option}>{option}</option>)}
                      </select>
                    ) : (
                      <input id={`official-${field.name}`} className="input" type={field.type} required
                        inputMode={field.type === 'tel' ? 'numeric' : undefined}
                        maxLength={field.type === 'tel' ? 10 : undefined}
                        autoComplete={field.type === 'password' ? 'new-password' : 'off'}
                        value={formData[field.name] || ''}
                        onChange={(event) => setFormData((previous) => ({ ...previous, [field.name]: event.target.value }))} />
                    )}
                  </div>
                ))}
              </div>
              {submitError && <p role="alert" className="flex items-center gap-2 rounded-xl bg-error-50 p-3 text-sm text-error-700"><AlertCircle size={16} />{submitError}</p>}
              {success && <p role="status" className="flex items-center gap-2 rounded-xl bg-success-50 p-3 text-sm text-success-700"><CheckCircle2 size={16} />{success}</p>}
              <button type="submit" className="btn w-full" disabled={busy || fields.length === 0}>
                {busy ? <Loader2 className="animate-spin" size={16} /> : <ShieldPlus size={16} />}
                Create {ROLE_LABELS[role]} account
              </button>
            </form>
          )}
        </section>

        <section className="card">
          <div className="mb-5 flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-secondary-100 text-secondary-700"><Users /></span>
            <div>
              <h2 className="text-lg font-bold">Managed officials</h2>
              <p className="text-sm text-neutral-500">{officials.length} account{officials.length === 1 ? '' : 's'}</p>
            </div>
          </div>
          {loadingOfficials ? (
            <p role="status" className="flex items-center gap-2 text-sm text-neutral-500"><Loader2 className="animate-spin" size={16} />Loading officials…</p>
          ) : loadError ? (
            <div role="alert" className="space-y-3">
              <p className="text-sm text-error-700">{loadError}</p>
              <button type="button" className="btn-outline" onClick={loadOfficials}>Try again</button>
            </div>
          ) : officials.length === 0 ? (
            <p className="rounded-xl bg-neutral-50 p-5 text-sm text-neutral-500">No accounts have been created yet.</p>
          ) : (
            <div className="space-y-3">
              {officials.map((official) => (
                <article key={official.id} className="rounded-xl border border-neutral-200 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <h3 className="font-semibold">{official.name}</h3>
                      <p className="text-sm text-neutral-500">{ROLE_LABELS[official.role]} · {official.user_code}</p>
                    </div>
                    <span className="rounded-full bg-success-50 px-2.5 py-1 text-xs font-semibold text-success-700">Account created</span>
                  </div>
                  <p className="mt-2 text-xs text-neutral-500">
                    {official.profile?.district || 'District not recorded'} · {official.mobile}
                  </p>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
