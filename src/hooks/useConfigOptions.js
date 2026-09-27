import { useEffect, useState } from "react";
import { getOptions } from "../api/client";

export const CLIENT_CONTRACT = "10.0";

export function useConfigOptions() {
  const [options, setOptions] = useState(null);
  const [mismatch, setMismatch] = useState(null);

  useEffect(() => {
    let cancelled = false;
    getOptions()
      .then((o) => {
        if (cancelled) return;
        setOptions(o);
        if (o.contract_version !== CLIENT_CONTRACT) setMismatch(o.contract_version);
      })
      .catch(() => {
        if (!cancelled) setOptions({ profiles: [], personas: [], defaults: {} });
      });
    return () => { cancelled = true; };
  }, []);

  return { options, mismatch };
}