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
  const [districts, setDistricts] = useState([]);
  const [mandals, setMandals] = useState([]);
  const [villages, setVillages] = useState([]);
  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting }
  } = useForm();
  const selectedDistrict = watch('district_id');
  const selectedMandal = watch('mandal_id');
  const isStaff = role !== 'HEALTH_WORKER';

  // The form is rebuilt whenever the profession changes
  useEffect(() => { reset(); setError(''); }, [role, reset]);

  // Load districts
  useEffect(() => {
    if (role !== 'HEALTH_WORKER') return;

    api.get('/locations/districts')
      .then((res) => setDistricts(res.data))
      .catch((err) => setError(errMsg(err)));
  }, [role]);

  // Load mandals when district changes
  useEffect(() => {
    setMandals([]);
    setVillages([]);

    setValue('mandal_id', '');
    setValue('village_id', '');

    if (!selectedDistrict) return;

    api.get(`/locations/mandals/${selectedDistrict}`)
      .then((res) => setMandals(res.data))
      .catch((err) => setError(errMsg(err)));
  }, [selectedDistrict, setValue]);

  // Load villages when mandal changes
  useEffect(() => {
    setVillages([]);
    setValue('village_id', '');

    if (!selectedMandal) return;

    api.get(`/locations/villages/${selectedMandal}`)
      .then((res) => setVillages(res.data))
      .catch((err) => setError(errMsg(err)));
  }, [selectedMandal, setValue]);

  const onSubmit = async (data) => {
    setError('');
    try {
      const district = districts.find((item) => String(item.id) === String(data.district_id));
      const mandal = mandals.find((item) => String(item.id) === String(data.mandal_id));
      const village = villages.find((item) => String(item.id) === String(data.village_id));
      if (!district || !mandal || !village) {
        setError('Select a valid district, mandal, and village');
        return;
      }

      await api.post('/auth/register', {
        ...data,
        district: district.name_en,
        mandal: mandal.name_en,
        village: village.name_en,
        role,
      });
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
                {roles[role].fields
                  .filter((f) => role !== 'HEALTH_WORKER' || !['district', 'mandal', 'village'].includes(f.name))
                  .map((f) => (
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
                {/* Location dropdowns for Health Worker */}
                {role === 'HEALTH_WORKER' && (
                  <>
                    <div>
                      <label className="label">District</label>
                      <select
                        className="input"
                        {...register('district_id', { required: 'Select a district' })}
                      >
                        <option value="">Select District</option>
                        {districts.map((district) => (
                          <option key={district.id} value={district.id}>
                            {district.name_en}
                          </option>
                        ))}
                      </select>
                      {errors.district_id && (
                        <p className="mt-1 text-xs text-error-600">
                          {errors.district_id.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="label">Mandal</label>
                      <select
                        className="input"
                        disabled={!selectedDistrict}
                        {...register('mandal_id', { required: 'Select a mandal' })}
                      >
                        <option value="">Select Mandal</option>
                        {mandals.map((mandal) => (
                          <option key={mandal.id} value={mandal.id}>
                            {mandal.name_en}
                          </option>
                        ))}
                      </select>
                      {errors.mandal_id && (
                        <p className="mt-1 text-xs text-error-600">
                          {errors.mandal_id.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="label">Village</label>
                      <select
                        className="input"
                        disabled={!selectedMandal}
                        {...register('village_id', { required: 'Select a village' })}
                      >
                        <option value="">Select Village</option>
                        {villages.map((village) => (
                          <option key={village.id} value={village.id}>
                            {village.name_en}
                          </option>
                        ))}
                      </select>
                      {errors.village_id && (
                        <p className="mt-1 text-xs text-error-600">
                          {errors.village_id.message}
                        </p>
                      )}
                    </div>
                  </>
                )}
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
