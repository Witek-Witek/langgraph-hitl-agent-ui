import { useCallback, useEffect, useState } from "react";
import { supabase } from "../api/supabase";

export function useAuth() {
  const [session, setSession] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setReady(true);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);                       // tylko zapis stanu — bez wywołań supabase w callbacku
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const signIn = (email, password) =>  
    supabase.auth.signInWithPassword({ email, password });

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    try {
      localStorage.removeItem("agent.settings");
    } catch { /* wygoda, nie wymóg */ }
  }, []);

  return { session, ready, signIn, signOut };
}

