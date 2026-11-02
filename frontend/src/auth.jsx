import { createContext, useContext, useState } from 'react';

const Ctx = createContext(null);
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => JSON.parse(localStorage.getItem('ad_user') || 'null'));
  const login = ({ token, user }) => {
    localStorage.setItem('ad_token', token);
    localStorage.setItem('ad_user', JSON.stringify(user));
    setUser(user);
  };
  const updateUser = (nextUser) => {
    localStorage.setItem('ad_user', JSON.stringify(nextUser));
    setUser(nextUser);
  };
  const logout = () => {
    localStorage.removeItem('ad_token');
    localStorage.removeItem('ad_user');
    setUser(null);
  };
  return <Ctx.Provider value={{ user, login, updateUser, logout }}>{children}</Ctx.Provider>;
}
