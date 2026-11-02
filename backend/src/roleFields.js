// Single source of truth for the registration form of each role.
// The frontend downloads this list (GET /api/auth/role-fields), so changing a field here changes the form.
const f = (name, label, te, type = 'text', options) => ({ name, label, te, type, options });
const pw = [
  f('password', 'Password', 'పాస్‌వర్డ్', 'password'),
  f('confirm', 'Confirm Password', 'పాస్‌వర్డ్ నిర్ధారించండి', 'password'),
];
const base = (idLabel, idTe, extra) => [
  f('name', 'Full Name', 'పూర్తి పేరు'),
  f('user_code', idLabel, idTe),
  f('mobile', 'Mobile Number', 'మొబైల్ నంబర్', 'tel'),
  ...extra,
  ...pw,
];
const email = f('email', 'Email', 'ఇమెయిల్', 'email');

export const ROLES = {
  HEALTH_WORKER: {
    label: 'Health Worker', te: 'ఆరోగ్య కార్యకర్త', idLabel: 'Worker ID', idTe: 'కార్యకర్త ఐడి',
    fields: base('Worker ID', 'కార్యకర్త ఐడి', [
      f('designation', 'Designation', 'హోదా', 'select', ['ASHA', 'ANM', 'Community Health Worker']),
      f('village', 'Village', 'గ్రామం'), f('mandal', 'Mandal', 'మండలం'),
      f('district', 'District', 'జిల్లా'), f('health_facility', 'Health Facility', 'ఆరోగ్య కేంద్రం'),
    ]),
  },
  MEDICAL_OFFICER: {
    label: 'Medical Officer', te: 'వైద్య అధికారి', idLabel: 'Medical ID', idTe: 'మెడికల్ ఐడి',
    fields: base('Medical ID', 'మెడికల్ ఐడి', [
      email, f('specialization', 'Specialization', 'ప్రత్యేకత'),
      f('designation', 'Designation', 'హోదా'), f('district', 'District', 'జిల్లా'), f('mandal', 'Mandal', 'మండలం'),
    ]),
  },
  SPECIALIST: {
    label: 'Specialist', te: 'నిపుణుడు', idLabel: 'Specialist ID', idTe: 'నిపుణుడి ఐడి',
    fields: base('Specialist ID', 'నిపుణుడి ఐడి', [
      email, f('med_qualification', 'Medical Qualification', 'వైద్య అర్హత'),
      f('specialization', 'Specialization', 'ప్రత్యేకత'), f('clinic_name', 'Clinic / Hospital Name', 'క్లినిక్ పేరు'),
      f('district', 'District', 'జిల్లా'),
    ]),
  },
  NAVIGATOR: {
    label: 'Navigator', te: 'నావిగేటర్', idLabel: 'Navigator ID', idTe: 'నావిగేటర్ ఐడి',
    fields: base('Navigator ID', 'నావిగేటర్ ఐడి', [
      email, f('qualification', 'Qualification', 'అర్హత'),
      f('organization_name', 'Organization Name', 'సంస్థ పేరు'),
      f('assigned_village', 'Assigned Village', 'కేటాయించిన గ్రామం'), f('district', 'District', 'జిల్లా'), f('mandal', 'Mandal', 'మండలం'),
    ]),
  },
  DISTRICT_ADMIN: {
    label: 'District Administrator', te: 'జిల్లా నిర్వాహకుడు', idLabel: 'Admin ID', idTe: 'అడ్మిన్ ఐడి',
    fields: base('Admin ID', 'అడ్మిన్ ఐడి', [
      email, f('designation', 'Designation', 'హోదా'), f('department', 'Department', 'శాఖ'),
      f('state', 'State', 'రాష్ట్రం'), f('district', 'District', 'జిల్లా'), f('mandal', 'Mandal', 'మండలం'),
    ]),
  },
  SUPER_ADMIN: {
    label: 'Super Admin', te: 'సూపర్ అడ్మిన్', idLabel: 'Super Admin ID', idTe: 'సూపర్ అడ్మిన్ ఐడి',
    fields: [],
  },
};

const COLUMN_FIELDS = ['name', 'user_code', 'mobile', 'email', 'password', 'confirm'];
export const profileKeys = (role) => ROLES[role].fields.map((x) => x.name).filter((n) => !COLUMN_FIELDS.includes(n));

// Returns an error message, or null when the submitted form is valid.
export function validateRegistration(role, body) {
  const cfg = ROLES[role];
  if (!cfg) return 'Please select a valid role';
  for (const fld of cfg.fields) {
    const v = String(body[fld.name] ?? '').trim();
    if (!v) return `${fld.label} is required`;
    if (fld.type === 'tel' && !/^\d{10}$/.test(v)) return 'Mobile number must be 10 digits';
    if (fld.type === 'email' && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v)) return 'Enter a valid email';
    if (fld.type === 'select' && !fld.options.includes(v)) return `Choose a valid ${fld.label}`;
  }
  if (body.password.length < 6) return 'Password must be at least 6 characters';
  if (body.password !== body.confirm) return 'Passwords do not match';
  return null;
}
