import { useEffect } from "react";
import { useLocation } from "react-router";
import { rememberPath } from "../lib/navMemory";

export default function NavMemoryTracker() {
  const { pathname } = useLocation();

  useEffect(() => {
    rememberPath(pathname);
  }, [pathname]);

  return null;
}
