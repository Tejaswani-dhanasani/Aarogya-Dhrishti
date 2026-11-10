import { Fragment, useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { LayoutDashboard, UserPlus, Users, UserCircle, LogOut, Languages, Menu, AlertTriangle, CalendarPlus, Fingerprint, ArrowRight, Phone, Mail, ClipboardCheck, FileText } from 'lucide-react';
import api, { errMsg } from '../api.js';
import { useAuth } from '../auth.jsx';
import { useLang } from '../lang.jsx';
import { riskOf, isThisWeek, initials } from '../utils.js';
import Logo from '../components/Logo.jsx';
import PatientForm from '../components/PatientForm.jsx';
import PatientList from '../components/PatientList.jsx';
import OfflinePatientSync from '../components/OfflinePatientSync.jsx';
import OfficialAccountManager from '../portal/OfficialAccountManager.jsx';

const ROLE_NAMES = { HEALTH_WORKER: 'Health Worker', MEDICAL_OFFICER: 'Medical Officer', SPECIALIST: 'Specialist', NAVIGATOR: 'Navigator', DISTRICT_ADMIN: 'District Administrator', SUPER_ADMIN: 'Super Admin' };
const WELCOME = {
  HEALTH_WORKER: 'Register patients, capture photos and record habits from your village.',
  MEDICAL_OFFICER: 'Review the patients screened in your mandal and decide on referrals.',
  SPECIALIST: 'See referred patients and guide diagnosis and treatment.',
  NAVIGATOR: 'Help patients reach appointments and track follow-up.',
  DISTRICT_ADMIN: 'Monitor district-level screening activity.',
  SUPER_ADMIN: 'Control platform access and manage district administrators.',
};
const WORKSPACE = {
  SUPER_ADMIN: {
    title: 'Platform administration',
    description: 'View District Admin accounts and manage platform access.',
    action: 'Review district admins',
    path: '/staff-management',
    status: 'District Admins register their own accounts and are active immediately.',
  },
  MEDICAL_OFFICER: {
    title: 'Clinical review workspace',
    description: 'Review patient records and open the medical review workspace.',
    action: 'Open clinical review',
    path: '/medical-officer/review',
    status: 'The review screen currently uses demo records.',
  },
  SPECIALIST: {
    title: 'Specialist consultation workspace',
    description: 'Schedule consultations and document specialist outcomes.',
    action: 'Manage consultations',
    path: '/specialist/consultation',
    status: 'Consultations are saved to the application database.',
  },
  NAVIGATOR: {
    title: 'Patient follow-up workspace',
    description: 'Record follow-ups and monitor patients in your district.',
    action: 'Manage follow-ups',
    path: '/follow-up',
    status: 'Follow-up records are saved to the application database.',
  },
  DISTRICT_ADMIN: {
    title: 'District administration workspace',
    description: 'Review official accounts and approval status for your district.',
    action: 'Review district officials',
    path: '/staff-management',
    status: 'Approve Medical Officer, Specialist and Navigator registrations in your district.',
  },
};

function Stat({ icon: Icon, label, value, tone }) {
  return (
    <div className="card flex items-center gap-4 p-5">
      <span className={`grid h-12 w-12 place-items-center rounded-2xl ${tone}`}><Icon size={22} /></span>
      <div><p className="text-3xl font-extrabold leading-none">{value}</p><p className="mt-1 text-sm text-neutral-500">{label}</p></div>
    </div>
  );
}

export default function Dashboard() {
  const { user, updateUser, logout } = useAuth();
  const { t, toggle, lang } = useLang();
  const [tab, setTab] = useState('overview');
  const [menuOpen, setMenuOpen] = useState(false);
  const [rows, setRows] = useState(null);
  const [error, setError] = useState('');
  const [mandalVillages, setMandalVillages] = useState([]);
  const [locationsLoading, setLocationsLoading] = useState(false);
  const [locationsError, setLocationsError] = useState('');
  const [locationsRetry, setLocationsRetry] = useState(0);
  const [publicContact, setPublicContact] = useState(user.profile?.public_contact === true);
  const [contactPreferenceBusy, setContactPreferenceBusy] = useState(false);
  const [contactPreferenceError, setContactPreferenceError] = useState('');
  const [contactPreferenceSaved, setContactPreferenceSaved] = useState(false);
  const isHW = user.role === 'HEALTH_WORKER';
  const canViewPatients = isHW || user.role === 'MEDICAL_OFFICER';
  const canPublishContact = user.role === 'MEDICAL_OFFICER' || user.role === 'SPECIALIST';
  const workspace = WORKSPACE[user.role];

  const load = useCallback(() => {
    if (!canViewPatients) return;
    api.get('/patients').then((r) => { setRows(r.data); setError(''); }).catch((e) => setError(errMsg(e)));
  }, [canViewPatients]);
  useEffect(load, [load]);

  useEffect(() => {
    if (user.role !== 'MEDICAL_OFFICER') return undefined;

    const districtName = user.profile?.district?.trim();
    const mandalName = user.profile?.mandal?.trim();
    if (!districtName || !mandalName) {
      setMandalVillages([]);
      setLocationsLoading(false);
      setLocationsError('Your account does not have a district and mandal assigned.');
      return undefined;
    }

    let active = true;
    setLocationsLoading(true);
    setLocationsError('');

    const loadMandalVillages = async () => {
      try {
        const { data: districts } = await api.get('/locations/districts');
        const district = districts.find(
          (item) => item.name_en.toLocaleLowerCase() === districtName.toLocaleLowerCase(),
        );
        if (!district) {
          if (active) setLocationsError(`Could not find district "${districtName}".`);
          return;
        }

        const { data: mandals } = await api.get(`/locations/mandals/${district.id}`);
        const mandal = mandals.find(
          (item) => item.name_en.toLocaleLowerCase() === mandalName.toLocaleLowerCase(),
        );
        if (!mandal) {
          if (active) setLocationsError(`Could not find mandal "${mandalName}" in ${districtName}.`);
          return;
        }

        const { data: villages } = await api.get(`/locations/villages/${mandal.id}`);
        if (active) setMandalVillages([{ ...mandal, villages }]);
      } catch (requestError) {
        if (active) {
          setLocationsError(
            requestError.response ? errMsg(requestError) : requestError.message || errMsg(requestError),
          );
        }
      } finally {
        if (active) setLocationsLoading(false);
      }
    };

    loadMandalVillages();
    return () => {
      active = false;
    };
  }, [user.profile?.district, user.profile?.mandal, user.role, locationsRetry]);

  const menu = [
    ['overview', t('dashboard'), LayoutDashboard],
    ...(isHW ? [['add', t('addPatient'), UserPlus]] : []),
    ...(canViewPatients ? [['patients', t('patientsList'), Users]] : []),
    ['profile', t('profile'), UserCircle],
  ];
  const go = (k) => { setTab(k); setMenuOpen(false); };
  const title = menu.find(([k]) => k === tab)?.[1];

  const saveContactPreference = async () => {
    setContactPreferenceBusy(true);
    setContactPreferenceError('');
    setContactPreferenceSaved(false);
    try {
      const { data } = await api.patch('/auth/contact-visibility', { public_contact: publicContact });
      updateUser(data);
      setPublicContact(data.profile?.public_contact === true);
      setContactPreferenceSaved(true);
    } catch (requestError) {
      setContactPreferenceError(errMsg(requestError));
    } finally {
      setContactPreferenceBusy(false);
    }
  };

  const total = rows?.length ?? 0;
  const high = rows?.filter((p) => riskOf(p).level === 'high').length ?? 0;
  const week = rows?.filter((p) => isThisWeek(p.created_at)).length ?? 0;
  const abha = rows?.filter((p) => p.abha_number).length ?? 0;
  const registeredVillageGroups = mandalVillages
    .map((mandal) => ({
      ...mandal,
      villages: mandal.villages
        .map((village) => ({
          ...village,
          patients: (rows || []).filter(
            (patient) => patient.village?.trim().toLocaleLowerCase()
              === village.name_en.trim().toLocaleLowerCase(),
          ),
        }))
        .filter((village) => village.patients.length > 0),
    }))
    .filter((mandal) => mandal.villages.length > 0);

  const sidebar = (
    <div className="flex h-full flex-col bg-neutral-900 text-neutral-300">
      <Link to="/" className="px-5 py-5"><Logo light /></Link>
      <nav className="flex-1 space-y-1 px-3">
        {menu.map(([key, label, Icon]) => (
          <button key={key} onClick={() => go(key)}
            className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition ${tab === key ? 'bg-primary-600 text-white shadow' : 'hover:bg-white/10 hover:text-white'}`}>
            <Icon size={18} />{label}
          </button>
        ))}
        {workspace && (
          <>
            <Link to={workspace.path} onClick={() => setMenuOpen(false)} className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition hover:bg-white/10 hover:text-white"><ClipboardCheck size={18} />{workspace.action}</Link>
            {(user.role === 'MEDICAL_OFFICER' || user.role === 'SPECIALIST') && (
              <Link to="/clinical-reports" onClick={() => setMenuOpen(false)} className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition hover:bg-white/10 hover:text-white"><FileText size={18} />Clinical reports</Link>
            )}
          </>
        )}
      </nav>
      <div className="space-y-1 border-t border-white/10 p-3">
        <button onClick={toggle} className="flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-sm hover:bg-white/10"><Languages size={18} />{lang === 'en' ? 'తెలుగు' : 'English'}</button>
        <button onClick={logout} className="flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-sm hover:bg-white/10"><LogOut size={18} />{t('logout')}</button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-neutral-100 lg:grid lg:grid-cols-[17rem_1fr]">
      <aside className="sticky top-0 hidden h-screen lg:block">{sidebar}</aside>

      {menuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 animate-fade-in bg-neutral-900/50" onClick={() => setMenuOpen(false)} />
          <div className="relative h-full w-72 animate-slide-in-right">{sidebar}</div>
        </div>
      )}

      <div className="min-w-0">
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-neutral-200 bg-white/85 px-4 py-3 backdrop-blur-lg md:px-8">
          <div className="flex items-center gap-3">
            <button className="rounded-lg p-2 hover:bg-neutral-100 lg:hidden" onClick={() => setMenuOpen(true)} aria-label="Menu"><Menu size={20} /></button>
            <h1 className="text-lg font-bold">{title}</h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold leading-tight">{user.name}</p>
              <p className="text-xs text-neutral-500">{ROLE_NAMES[user.role]}</p>
            </div>
            <span className="grid h-10 w-10 place-items-center rounded-full bg-primary-600 text-sm font-bold text-white">{initials(user.name)}</span>
          </div>
        </header>

        <main className="space-y-6 p-4 md:p-8">
          {isHW && <OfflinePatientSync workerId={user.id} onSynced={load} />}

          {tab === 'overview' && (
            <div className="animate-fade-up space-y-6">
              <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary-700 to-secondary-700 p-6 text-white md:p-8">
                <div className="bg-dots absolute inset-0" aria-hidden />
                <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-sm text-primary-100">{t('welcome')},</p>
                    <h2 className="text-2xl font-extrabold md:text-3xl">{user.name}</h2>
                    <p className="mt-1 text-sm text-primary-50/90">{ROLE_NAMES[user.role]} · ID {user.user_code}</p>
                    <p className="mt-3 max-w-xl text-primary-50/90">{WELCOME[user.role]}</p>
                  </div>
                  {isHW && <button onClick={() => go('add')} className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 font-semibold text-primary-800 shadow-lg hover:bg-primary-50"><UserPlus size={18} />{t('addPatient')}</button>}
                </div>
              </section>

              {canViewPatients ? (
                <section className={`grid gap-4 sm:grid-cols-2 ${isHW ? 'xl:grid-cols-4' : 'xl:grid-cols-3'}`}>
                <Stat icon={Users} label={t('totalPatients')} value={total} tone="bg-primary-100 text-primary-700" />
                <Stat icon={AlertTriangle} label={t('highPriority')} value={high} tone="bg-error-100 text-error-600" />
                <Stat icon={CalendarPlus} label={t('thisWeek')} value={week} tone="bg-secondary-100 text-secondary-700" />
                {isHW && <Stat icon={Fingerprint} label={t('withAbha')} value={abha} tone="bg-success-100 text-success-700" />}
                </section>
              ) : null}

              {user.role === 'MEDICAL_OFFICER' && (
                <section className="card p-5 md:p-6">
                  <div className="mb-4">
                    <h2 className="text-lg font-bold">Patients by Village</h2>
                    <p className="mt-1 text-sm text-neutral-500">
                      Registered patients from villages in your assigned mandal ({user.profile?.mandal || 'not set'}).
                    </p>
                  </div>
                  {locationsLoading ? (
                    <p role="status" className="text-sm text-neutral-500">Loading villages…</p>
                  ) : locationsError ? (
                    <div role="alert" className="flex flex-wrap items-center gap-3 text-sm text-error-700">
                      <p>{locationsError}</p>
                      {user.profile?.district && user.profile?.mandal && (
                        <button className="font-semibold underline" onClick={() => setLocationsRetry((retry) => retry + 1)}>
                          Try again
                        </button>
                      )}
                    </div>
                  ) : error ? (
                    <p role="alert" className="text-sm text-error-700">Unable to load patient records, so villages with registered patients cannot be shown.</p>
                  ) : rows === null ? (
                    <p role="status" className="text-sm text-neutral-500">Loading patient records…</p>
                  ) : registeredVillageGroups.length === 0 ? (
                    <p className="text-sm text-neutral-500">
                      No patients have been registered from villages in {user.profile?.mandal || 'your assigned mandal'} yet.
                    </p>
                  ) : (
                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                      {registeredVillageGroups.flatMap((mandal) => mandal.villages.map((village) => (
                        <div key={village.id} className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
                          <h3 className="font-semibold text-neutral-800">{village.name_en}</h3>
                          <p className="mt-1 text-xs text-neutral-500">{mandal.name_en} · {village.patients.length} patient{village.patients.length === 1 ? '' : 's'}</p>
                          <ul className="mt-3 space-y-2 text-sm text-neutral-600">
                            {village.patients.map((patient) => (
                              <li key={patient.id}>{patient.name}</li>
                            ))}
                          </ul>
                        </div>
                      )))}
                    </div>
                  )}
                </section>
              )}

              {workspace && (
                <section className="card flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-lg font-bold">{workspace.title}</h2>
                  <p className="mt-1 text-sm text-neutral-600">{workspace.description}</p>
                  <p className="mt-2 text-xs text-neutral-500">{workspace.status}</p>
                </div>
                <Link to={workspace.path} className="btn shrink-0">{workspace.action}<ArrowRight size={16} /></Link>
                {(user.role === 'MEDICAL_OFFICER' || user.role === 'SPECIALIST') && (
                  <Link to="/clinical-reports" className="btn shrink-0"><FileText size={16} />Clinical reports</Link>
                )}
                </section>
              )}

              {user.role === 'DISTRICT_ADMIN' && (
                <OfficialAccountManager embedded />
              )}

              {canViewPatients && <section>
                <div className="mb-3 flex items-center justify-between">
                <h2 className="text-lg font-bold">{t('recent')}</h2>
                <button onClick={() => go('patients')} className="inline-flex items-center gap-1 text-sm font-semibold text-primary-700 hover:underline">{t('viewAll')}<ArrowRight size={14} /></button>
                </div>
                <PatientList rows={rows} loading={!rows && !error} error={error} limit={5} compact />
              </section>}
            </div>
          )}

          {tab === 'add' && isHW && <PatientForm onSaved={load} />}
          {tab === 'patients' && canViewPatients && (
            <>
              <PatientList
                rows={rows}
                loading={!rows && !error}
                error={error}
                canManage={isHW}
                onChanged={load}
              />
            </>
          )}

          {tab === 'profile' && (
            <div className="card mx-auto max-w-2xl animate-fade-up p-0">
              <div className="flex items-center gap-4 border-b p-6">
                <span className="grid h-16 w-16 place-items-center rounded-2xl bg-primary-600 text-xl font-bold text-white">{initials(user.name)}</span>
                <div><h2 className="text-xl font-bold">{user.name}</h2><p className="text-sm text-neutral-500">{ROLE_NAMES[user.role]} · ID {user.user_code}</p></div>
              </div>
              <dl className="grid grid-cols-1 gap-x-8 gap-y-5 p-6 sm:grid-cols-2">
                <div><dt className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-neutral-400"><Phone size={12} />Mobile</dt><dd className="mt-1 text-sm">{user.mobile}</dd></div>
                {user.email && <div><dt className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-neutral-400"><Mail size={12} />Email</dt><dd className="mt-1 text-sm">{user.email}</dd></div>}
                {Object.entries(user.profile || {}).filter(([key]) => key !== 'public_contact').map(([k, v]) => (
                  <Fragment key={k}><div><dt className="text-xs font-semibold uppercase tracking-wider text-neutral-400">{k.replace(/_/g, ' ')}</dt><dd className="mt-1 text-sm">{v}</dd></div></Fragment>
                ))}
              </dl>
              {canPublishContact && (
                <section className="border-t p-6">
                  <h3 className="font-semibold">Public Contact Us listing</h3>
                  <p className="mt-1 text-sm text-neutral-600">
                    Choose whether your name, role, district, phone number, and email address may appear publicly on the Contact Us page.
                    Your details stay private unless you opt in.
                  </p>
                  <label className="mt-4 flex items-start gap-3 text-sm">
                    <input type="checkbox" className="mt-1 h-4 w-4 accent-primary-600" checked={publicContact}
                      onChange={(event) => { setPublicContact(event.target.checked); setContactPreferenceSaved(false); }} />
                    <span>I agree to publish my professional contact details on the public Contact Us page. I can withdraw this consent at any time.</span>
                  </label>
                  {contactPreferenceError && <p role="alert" className="mt-3 text-sm text-error-700">{contactPreferenceError}</p>}
                  {contactPreferenceSaved && <p role="status" className="mt-3 text-sm text-success-700">Your public contact preference has been saved.</p>}
                  <button type="button" className="btn mt-4" onClick={saveContactPreference} disabled={contactPreferenceBusy || publicContact === (user.profile?.public_contact === true)}>
                    {contactPreferenceBusy && <span className="animate-spin">⏳</span>}
                    {publicContact ? 'Publish my contact details' : 'Keep my contact details private'}
                  </button>
                </section>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
