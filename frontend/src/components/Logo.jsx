import { HeartPulse } from 'lucide-react';

export default function Logo({ light = false, size = 'md' }) {
  const box = size === 'lg' ? 'h-11 w-11' : 'h-9 w-9';
  return (
    <span className={`inline-flex items-center gap-2.5 font-bold ${light ? 'text-white' : 'text-neutral-900'}`}>
      <span className={`grid ${box} place-items-center rounded-xl bg-gradient-to-br from-primary-500 to-secondary-600 text-white shadow-md shadow-primary-600/30`}>
        <HeartPulse size={size === 'lg' ? 24 : 20} />
      </span>
      <span className="leading-none">
        Sehat
        <span className={`mt-0.5 block text-[10px] font-semibold uppercase tracking-widest ${light ? 'text-primary-200' : 'text-primary-600'}`}>Health for Every Village</span>
      </span>
    </span>
  );
}
