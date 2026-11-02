import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Languages, Menu, X } from 'lucide-react';
import { useLang } from '../lang.jsx';
import { useAuth } from '../auth.jsx';
import Logo from './Logo.jsx';

export default function Navbar() {
  const { t, lang, toggle } = useLang();
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const links = [['/#home', t('home')], ['/#how', t('howItWorks')], ['/#about', t('about')], ['/#contact', t('contact')], ['/#help', t('help')]];
  const langBtn = (
    <button onClick={toggle} className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-300 px-3 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-100" aria-label="Change language">
      <Languages size={16} />{lang === 'en' ? 'తెలుగు' : 'English'}
    </button>
  );

  return (
    <header className="sticky top-0 z-40 border-b border-neutral-200/80 bg-white/85 backdrop-blur-lg">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link to="/" aria-label="Aarogya Drishti home"><Logo /></Link>
        <nav className="hidden items-center gap-7 text-sm font-medium text-neutral-600 lg:flex">
          {links.map(([h, l]) => <a key={h} href={h} className="transition hover:text-primary-700">{l}</a>)}
        </nav>
        <div className="hidden items-center gap-2 lg:flex">
          {langBtn}
          {user ? (
            <>
              <Link to="/dashboard" className="btn">{t('dashboard')}</Link>
              <button onClick={logout} className="btn-ghost">{t('logout')}</button>
            </>
          ) : (
            <>
              <Link to="/login" className="btn-ghost">{t('login')}</Link>
              <Link to="/register" className="btn">{t('register')}</Link>
            </>
          )}
        </div>
        <button className="rounded-lg p-2 hover:bg-neutral-100 lg:hidden" onClick={() => setOpen(!open)} aria-label="Menu">{open ? <X /> : <Menu />}</button>
      </div>
      {open && (
        <div className="animate-fade-in space-y-1 border-t bg-white px-4 py-3 lg:hidden">
          {links.map(([h, l]) => <a key={h} href={h} onClick={() => setOpen(false)} className="block rounded-lg px-3 py-2.5 font-medium text-neutral-700 hover:bg-neutral-100">{l}</a>)}
          <div className="flex items-center gap-2 pt-2">
            {langBtn}
            {user ? <Link to="/dashboard" className="btn flex-1">{t('dashboard')}</Link> : <>
              <Link to="/login" className="btn-outline flex-1">{t('login')}</Link>
              <Link to="/register" className="btn flex-1">{t('register')}</Link></>}
          </div>
        </div>
      )}
    </header>
  );
}
