import { useEffect, useState } from 'react';
import api, { errMsg } from './api.js';

// Loads the role -> form-fields definition from the backend
export function useRoles() {
  const [roles, setRoles] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => {
    api.get('/auth/role-fields').then((r) => setRoles(r.data)).catch((e) => setError(errMsg(e)));
  }, []);
  return { roles, error };
}
