"use client";

import { useCallback, useEffect, useState } from "react";

import { readDesignStore, type DesignStore } from "@/lib/design-storage";

export function useDesignStore() {
  const [store, setStore] = useState<DesignStore>(() => readDesignStore());

  const refresh = useCallback(() => {
    setStore(readDesignStore());
  }, []);

  useEffect(() => {
    refresh();

    const onChange = () => refresh();
    window.addEventListener("fabrix-design-store-changed", onChange);
    window.addEventListener("storage", onChange);

    return () => {
      window.removeEventListener("fabrix-design-store-changed", onChange);
      window.removeEventListener("storage", onChange);
    };
  }, [refresh]);

  return { store, refresh };
}
