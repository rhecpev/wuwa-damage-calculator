import { useEffect, useState } from "react";
import { loadPersisted, savePersisted } from "./persist";

/** useState와 같은데 값이 바뀔 때마다 localStorage에 자동 저장된다. */
export function usePersistedState<T>(name: string, initial: T) {
  const [value, setValue] = useState<T>(() => loadPersisted(name, initial));

  useEffect(() => {
    savePersisted(name, value);
  }, [name, value]);

  return [value, setValue] as const;
}
