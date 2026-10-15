import { supabase } from "./supabase";

async function authHeader() {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/** fetch z tokenem. 401 → odśwież sesję → ponów RAZ → drugi 401 → wyloguj. */
export async function authFetch(url, init = {}) {
  const send = async () =>
    fetch(url, { ...init, headers: { ...(init.headers ?? {}), ...(await authHeader()) } });

  let res = await send();
  if (res.status !== 401) return res;

  const { error } = await supabase.auth.refreshSession();
  if (!error) res = await send();
  if (res.status === 401) await supabase.auth.signOut();   // → onAuthStateChange → ekran logowania
  return res;
}