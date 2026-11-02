import { Link } from 'react-router-dom';
import { ShieldCheck, ArrowRight } from 'lucide-react';
import { ROLE_TO_SLUG } from '../portal/roles.js';
import { useLang } from '../lang.jsx';

// Shown on the main Register / Login pages when a higher-level staff role is selected.
export default function StaffNotice({ mode, roleName }) {
  const { t } = useLang();
  return (
    <div className="mt-6 animate-fade-in rounded-2xl bg-primary-50 p-5 ring-1 ring-primary-200">
      <p className="flex items-center gap-2 font-semibold text-primary-800"><ShieldCheck size={18} />{t('staffNoticeTitle')}</p>
      <p className="mt-1.5 text-sm text-neutral-600">{t('staffNoticeText')}</p>
      <Link to={`/${mode}/${ROLE_TO_SLUG[roleName]}`} className="btn mt-4">{t('staffContinue')}<ArrowRight size={16} /></Link>
    </div>
  );
}
