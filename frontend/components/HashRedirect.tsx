"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// The pre-migration site used HashRouter, so old links/bookmarks point at
// paths like "/#/About" rather than "/about". Real routes replace the hash
// router (docs/aws-migration-plan.md Phase 1), but a hash fragment is never
// sent to the server, so the only place we can catch and redirect these is
// client-side after the (real) "/" route has already loaded.
const LEGACY_HASH_ROUTES: Record<string, string> = {
  "#/home": "/",
  "#/about": "/about",
  "#/get-involved": "/get-involved",
  "#/calendar": "/calendar",
};

const HashRedirect = () => {
  const router = useRouter();

  useEffect(() => {
    const hash = window.location.hash.toLowerCase();
    const target = LEGACY_HASH_ROUTES[hash];
    if (target) {
      router.replace(target);
    }
  }, [router]);

  return null;
};

export default HashRedirect;
