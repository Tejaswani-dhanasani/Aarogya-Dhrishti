import { Link } from 'react-router-dom';
import { ShieldCheck, Languages, ArrowLeft } from 'lucide-react';
import Logo from './Logo.jsx';
import { useLang } from '../lang.jsx';

// Split-screen layout shared by Login and Register.
export default function AuthShell({ children, wide = false }) {
  const { t, lang, toggle } = useLang();
  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[.8fr_1.2fr]">
      <aside className="relative hidden overflow-hidden bg-gradient-to-br from-primary-800 via-primary-700 to-secondary-700 p-10 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="bg-dots absolute inset-0" aria-hidden />
        <Link to="/" className="relative"><Logo light size="lg" /></Link>
        <div className="relative">
          <h2 className="text-4xl font-extrabold leading-tight">{t('heroTitle')}</h2>
          <p className="mt-4 max-w-md text-primary-50/90">{t('tagline')}</p>
          <ul className="mt-8 space-y-3 text-sm">
            {[t('abdm1'), t('abdm2'), t('abdm3')].map((l) => (
              <li key={l} className="flex items-center gap-3"><span className="grid h-7 w-7 place-items-center rounded-full bg-white/20"><ShieldCheck size={15} /></span>{l}</li>
            ))}
          </ul>
        </div>
      </aside>

      <main className="flex min-h-screen flex-col bg-neutral-50">
        <div className="flex items-center justify-between px-5 py-4">
          <Link to="/" className="inline-flex items-center gap-1.5 text-sm font-medium text-neutral-600 hover:text-primary-700"><ArrowLeft size={16} />{t('home')}</Link>
          <button onClick={toggle} className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium hover:bg-neutral-100"><Languages size={16} />{lang === 'en' ? 'తెలుగు' : 'English'}</button>
        </div>
        <div className="flex flex-1 items-center justify-center px-4 pb-10">
          <div className={`w-full animate-fade-up ${wide ? 'max-w-2xl' : 'max-w-md'}`}>{children}</div>
        </div>
      </main>
    </div>
  );
}
