import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Users, Stethoscope, HeartPulse, Phone, Mail, Siren, ShieldCheck, ArrowRight, ScanSearch, ClipboardCheck, Video, Route, Languages, Fingerprint, CheckCircle2, AlertTriangle } from 'lucide-react';
import Navbar from '../components/Navbar.jsx';
import Logo from '../components/Logo.jsx';
import { useLang } from '../lang.jsx';
import { CONTACTS, EMERGENCY } from '../siteConfig.js';
import api, { errMsg } from '../api.js';

// Decorative "health card" shown in the hero (demo data only)
function HealthCard() {
  return (
    <div className="relative mx-auto w-full max-w-sm animate-float">
      <div className="absolute -inset-4 rounded-[2rem] bg-white/10 blur-2xl" />
      <div className="relative overflow-hidden rounded-3xl bg-white p-5 text-neutral-800 shadow-2xl ring-1 ring-black/5">
        <div className="flex items-center justify-between">
          <Logo size="md" />
          <span className="pill bg-success-100 text-success-700"><CheckCircle2 size={14} />Consent</span>
        </div>
        <div className="mt-5 flex items-center gap-4">
          <span className="grid h-14 w-14 place-items-center rounded-2xl bg-primary-100 text-xl font-bold text-primary-700">SK</span>
          <div>
            <p className="font-semibold">Sample Patient</p>
            <p className="text-sm text-neutral-500">45 yrs · Female · Demo village</p>
          </div>
        </div>
        <div className="mt-4 rounded-2xl bg-neutral-50 p-3 text-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-neutral-400">ABHA number</p>
          <p className="mt-0.5 font-mono tracking-wider">12-3456-7890-1234</p>
        </div>
        <div className="mt-3 flex flex-wrap gap-2 text-xs font-medium">
          <span className="pill bg-warning-100 text-warning-700">Non-healing ulcer · 3 wks</span>
          <span className="pill bg-neutral-100 text-neutral-600">Tobacco chewing</span>
        </div>
        <div className="mt-4 flex items-center justify-between rounded-2xl bg-primary-600 px-4 py-3 text-white">
          <span className="text-sm font-medium">Priority</span>
          <span className="flex items-center gap-1.5 text-sm font-bold"><span className="h-2 w-2 rounded-full bg-warning-300" />Medium · Refer</span>
        </div>
      </div>
    </div>
  );
}

export default function Landing() {
  const { t, lang } = useLang();
  const [officials, setOfficials] = useState([]);
  const [officialsError, setOfficialsError] = useState('');
  const [loadingOfficials, setLoadingOfficials] = useState(true);

  useEffect(() => {
    api.get('/contact/officials')
      .then(({ data }) => setOfficials(data))
      .catch((error) => setOfficialsError(errMsg(error)))
      .finally(() => setLoadingOfficials(false));
  }, []);

  const roleCards = [
    [Users, t('workers'), t('workersT')],
    [Stethoscope, t('specialists'), t('specialistsT')],
    [HeartPulse, t('patients'), t('patientsT')],
  ];
  const steps = [
    [ScanSearch, t('s1'), t('s1t')], [ClipboardCheck, t('s2'), t('s2t')],
    [Video, t('s3'), t('s3t')], [Route, t('s4'), t('s4t')],
  ];
  const warns = [t('warn1'), t('warn2'), t('warn3'), t('warn4')];

  return (
    <div>
      <Navbar />

      <section id="home" className="relative overflow-hidden bg-gradient-to-br from-primary-800 via-primary-700 to-secondary-700 text-white">
        <div className="bg-dots absolute inset-0" aria-hidden />
        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 md:py-24 lg:grid-cols-[1.1fr_.9fr]">
          <div>
            <h1 className="mt-5 animate-fade-up text-4xl font-extrabold leading-[1.1] md:text-6xl">{t('heroTitle')}</h1>
            <p className="mt-5 max-w-xl animate-fade-up text-lg text-primary-50/90">{t('heroSub')}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/register" className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 font-semibold text-primary-800 shadow-lg transition hover:bg-primary-50">{t('getStarted')}<ArrowRight size={18} /></Link>
              <a href="#how" className="rounded-xl border border-white/50 px-6 py-3 font-semibold transition hover:bg-white/10">{t('learn')}</a>
            </div>
          </div>
          <HealthCard />
        </div>
      </section>

      <section className="relative z-10 mx-auto -mt-8 max-w-6xl px-4">
        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl bg-neutral-200 shadow-lg ring-1 ring-neutral-200 md:grid-cols-4">
          {[['5', t('stat1')], ['4', t('stat2')], ['2', t('stat3')], ['100%', t('stat4')]].map(([n, l]) => (
            <div key={l} className="bg-white px-5 py-5 text-center">
              <p className="text-3xl font-extrabold text-primary-700">{n}</p>
              <p className="mt-0.5 text-xs font-medium text-neutral-500 md:text-sm">{l}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto mt-12 grid max-w-6xl gap-5 px-4 md:grid-cols-3">
        {roleCards.map(([Icon, title, text]) => (
          <div key={title} className="card transition hover:-translate-y-1 hover:shadow-md">
            <span className="grid h-12 w-12 place-items-center rounded-xl bg-primary-100 text-primary-700"><Icon /></span>
            <h3 className="mt-4 text-lg font-semibold">{title}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-neutral-600">{text}</p>
          </div>
        ))}
      </section>

      <section id="how" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-20">
        <p className="sec-eyebrow">{t('howItWorks')}</p>
        <h2 className="sec-title max-w-2xl">{t('howTitle')}</h2>
        <div className="relative mt-10 grid gap-5 md:grid-cols-4">
          {steps.map(([Icon, title, text], i) => (
            <div key={title} className="card relative">
              <span className="absolute right-4 top-3 text-5xl font-black text-neutral-100">{i + 1}</span>
              <span className="relative grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-primary-500 to-secondary-600 text-white"><Icon size={20} /></span>
              <h3 className="relative mt-4 font-semibold">{title}</h3>
              <p className="relative mt-1 text-sm text-neutral-600">{text}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="about" className="scroll-mt-20 bg-white py-20">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 md:grid-cols-2">
          <div>
            <p className="sec-eyebrow">{t('about')}</p>
            <h2 className="sec-title">{t('aboutTitle')}</h2>
            <p className="mt-5 leading-relaxed text-neutral-600">{t('aboutText1')}</p>
          </div>
          <div className="rounded-3xl bg-warning-50 p-7 ring-1 ring-warning-200">
            <h3 className="flex items-center gap-2 text-lg font-bold text-warning-800"><AlertTriangle size={20} />{t('warnTitle')}</h3>
            <ul className="mt-4 space-y-3">
              {warns.map((w) => <li key={w} className="flex items-start gap-3 text-neutral-700"><CheckCircle2 size={20} className="mt-0.5 shrink-0 text-warning-600" />{w}</li>)}
            </ul>
            <p className="mt-5 flex items-center gap-2 text-sm font-semibold text-warning-800"><ShieldCheck size={18} />{t('warnNote')}</p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-20">
        <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-neutral-900 to-primary-900 p-8 text-white md:p-12">
          <div className="grid items-center gap-8 md:grid-cols-[1.2fr_1fr]">
            <div>
              <p className="sec-eyebrow !text-primary-300">ABDM</p>
              <h2 className="text-3xl font-bold md:text-4xl">{t('abdmTitle')}</h2>
              <p className="mt-4 leading-relaxed text-neutral-300">{t('abdmText')}</p>
            </div>
            <ul className="space-y-3">
              {[[Fingerprint, t('abdm1')], [ShieldCheck, t('abdm2')], [Languages, t('abdm3')]].map(([Icon, l]) => (
                <li key={l} className="flex items-center gap-3 rounded-2xl bg-white/10 px-4 py-3 ring-1 ring-white/15"><Icon size={20} className="text-primary-300" />{l}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section id="contact" className="scroll-mt-20 bg-white py-20">
        <div className="mx-auto max-w-6xl px-4">
          <p className="sec-eyebrow">{t('contact')}</p>
          <h2 className="sec-title">{t('contactTitle')}</h2>
          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {CONTACTS.map((c) => (
              <div key={c.role} className="card">
                <h3 className="font-semibold">{lang === 'te' ? c.roleTe : c.role}</h3>
                <a href={`tel:${c.mobile.replace(/\s/g, '')}`} className="mt-4 flex items-center gap-2 text-sm hover:text-primary-700"><Phone size={16} className="text-primary-600" />{c.mobile}</a>
                <a href={`mailto:${c.email}`} className="mt-2 flex items-center gap-2 text-sm hover:text-primary-700"><Mail size={16} className="text-primary-600" />{c.email}</a>
              </div>
            ))}
            {loadingOfficials && (
              <p role="status" className="card text-sm text-neutral-500">Loading opted-in Medical Officer and Specialist contacts…</p>
            )}
            {officialsError && (
              <p role="alert" className="card text-sm text-error-700">{officialsError}</p>
            )}
            {!loadingOfficials && !officialsError && officials.map((official) => (
              <div key={`${official.role}-${official.name}-${official.email}`} className="card">
                <h3 className="font-semibold">{official.role === 'MEDICAL_OFFICER' ? 'Medical Officer' : 'Specialist'}</h3>
                <p className="mt-1 text-sm text-neutral-700">{official.name}</p>
                {(official.specialization || official.district) && (
                  <p className="mt-1 text-sm text-neutral-500">
                    {[official.specialization, official.district].filter(Boolean).join(' · ')}
                  </p>
                )}
                {official.mobile && <a href={`tel:${official.mobile}`} className="mt-4 flex items-center gap-2 text-sm hover:text-primary-700"><Phone size={16} className="text-primary-600" />{official.mobile}</a>}
                {official.email && <a href={`mailto:${official.email}`} className="mt-2 flex items-center gap-2 text-sm hover:text-primary-700"><Mail size={16} className="text-primary-600" />{official.email}</a>}
              </div>
            ))}
            {!loadingOfficials && !officialsError && officials.length === 0 && (
              <p className="card text-sm text-neutral-500">No Medical Officers or Specialists have chosen to publish their contact details yet.</p>
            )}
          </div>
        </div>
      </section>

      <section id="help" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-20">
        <div className="flex flex-col gap-6 rounded-3xl bg-error-50 p-8 ring-1 ring-error-200 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-3xl font-bold text-error-700"><Siren />{t('helpTitle')}</h2>
            <p className="mt-2 max-w-xl text-neutral-700">{t('helpText')}</p>
          </div>
          <div className="text-center md:text-right">
            <p className="text-sm font-medium text-neutral-600">{t('emergency')}</p>
            <a href={`tel:${EMERGENCY.mobile}`} className="mt-1 inline-flex items-center gap-2 rounded-2xl bg-error-600 px-8 py-3 text-3xl font-extrabold text-white shadow-lg hover:bg-error-700"><Phone />{EMERGENCY.mobile}</a>
            <p className="mt-2 text-sm text-neutral-600">{t('email')}: {EMERGENCY.email}</p>
          </div>
        </div>
      </section>

      <footer className="bg-neutral-900 py-10 text-neutral-400">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 text-sm md:flex-row">
          <Logo light />
          <p>© 2026 Sehat · Health for Every Village · Demo data only</p>
        </div>
      </footer>
    </div>
  );
}
