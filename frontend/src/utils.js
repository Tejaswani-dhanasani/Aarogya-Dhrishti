// Small helpers shared by the dashboard screens.

// Indicative screening priority from symptoms, tobacco and habits.
// This helps health workers decide whom to refer first. It is NOT a diagnosis.
const SYMPTOM_WEIGHT = {
  'Non-healing mouth ulcer': 3, 'Neck swelling': 3, 'White patch': 2, 'Red patch': 2,
  'Difficulty swallowing': 2, 'Limited mouth opening': 2, 'Pain in mouth': 1,
};

export function riskOf(p) {
  let score = 0;
  (p.symptoms || []).forEach((s) => { score += SYMPTOM_WEIGHT[s.name] || 1; });
  if (p.tobacco && p.tobacco !== 'None') score += 2;
  score += Math.min((p.habits || []).length, 3);
  if (score >= 6) return { level: 'high', score, cls: 'bg-error-100 text-error-700', dot: 'bg-error-500' };
  if (score >= 3) return { level: 'medium', score, cls: 'bg-warning-100 text-warning-700', dot: 'bg-warning-500' };
  return { level: 'low', score, cls: 'bg-success-100 text-success-700', dot: 'bg-success-500' };
}

export const initials = (name = '') => name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('') || '?';

export const formatAbha = (v) => {
  const d = String(v || '').replace(/\D/g, '').slice(0, 14);
  return [d.slice(0, 2), d.slice(2, 6), d.slice(6, 10), d.slice(10, 14)].filter(Boolean).join('-');
};

export const formatPatientId = (id) => `AD-${String(id).padStart(6, '0')}`;

export const fmtDate = (iso) => new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
export const isThisWeek = (iso) => Date.now() - new Date(iso).getTime() < 7 * 24 * 3600 * 1000;
