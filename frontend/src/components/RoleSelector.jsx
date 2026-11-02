import { HeartHandshake, Stethoscope, Microscope, Route, Building2 } from 'lucide-react';
import { useLang } from '../lang.jsx';

const ICONS = { HEALTH_WORKER: HeartHandshake, MEDICAL_OFFICER: Stethoscope, SPECIALIST: Microscope, NAVIGATOR: Route, DISTRICT_ADMIN: Building2 };

// Profession tiles; selecting one changes the form below it.
export default function RoleSelector({ roles, value, onChange }) {
  const { lang } = useLang();
  return (
    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5" role="radiogroup">
      {Object.entries(roles).map(([key, r]) => {
        const Icon = ICONS[key] || Stethoscope;
        const on = value === key;
        return (
          <button type="button" key={key} role="radio" aria-checked={on} onClick={() => onChange(key)}
            className={`flex flex-col items-center gap-1.5 rounded-2xl border-2 px-2 py-3 text-center text-xs font-semibold transition sm:text-sm ${
              on ? 'border-primary-600 bg-primary-50 text-primary-800 shadow-sm' : 'border-neutral-200 bg-white text-neutral-600 hover:border-primary-300'}`}>
            <span className={`grid h-9 w-9 place-items-center rounded-xl ${on ? 'bg-primary-600 text-white' : 'bg-neutral-100 text-neutral-500'}`}><Icon size={18} /></span>
            {lang === 'te' ? r.te : r.label}
          </button>
        );
      })}
    </div>
  );
}
