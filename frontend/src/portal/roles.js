// Maps between portal URL slugs and backend role names.
export const STAFF_ROLES = ['MEDICAL_OFFICER', 'SPECIALIST', 'NAVIGATOR', 'DISTRICT_ADMIN'];
export const SLUG_TO_ROLE = {
  'super-admin': 'SUPER_ADMIN',
  'medical-officer': 'MEDICAL_OFFICER',
  specialist: 'SPECIALIST',
  'patient-navigator': 'NAVIGATOR',
  'district-admin': 'DISTRICT_ADMIN',
};
export const ROLE_TO_SLUG = Object.fromEntries(Object.entries(SLUG_TO_ROLE).map(([s, r]) => [r, s]));
