"use client";

import { useEffect, useState } from "react";
import {
  COMMAND_BILLING_UNAVAILABLE_MESSAGE,
  commandBillingAccessBlock,
} from "@/lib/auth/commandAccess";

export function useCommandBillingGate(user) {
  const [loading, setLoading] = useState(true);
  const [block, setBlock] = useState(null);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      setBlock(null);
      return;
    }

    let active = true;

    fetch("/api/system-settings/map")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!active) return;
        setBlock(
          commandBillingAccessBlock(user, data?.command_access_suspended) ?? null
        );
      })
      .catch(() => {
        if (active) setBlock(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [user]);

  return {
    loading,
    blocked: Boolean(block),
    message: block?.message ?? COMMAND_BILLING_UNAVAILABLE_MESSAGE,
  };
}
