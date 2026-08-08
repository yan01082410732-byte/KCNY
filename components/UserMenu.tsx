"use client";

import { useEffect, useRef, useState } from "react";
import type { Language } from "@/lib/auth";
import {
  shouldCloseUserMenuForKey,
  shouldCloseUserMenuForPointerTarget,
  userMenuAvatarInitial,
  userMenuButtonState,
  userMenuLabels,
  userMenuProfileHref,
} from "@/lib/user-menu";

export function UserMenu({ language, username, displayName }: { language: Language; username?: string; displayName?: string }) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const labels = userMenuLabels(language);
  const profileHref = userMenuProfileHref(username, language);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: PointerEvent) {
      if (shouldCloseUserMenuForPointerTarget(menuRef.current, event.target as Node | null)) {
        setOpen(false);
      }
    }

    document.addEventListener("pointerdown", onPointerDown, true);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown, true);
    };
  }, [open]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (shouldCloseUserMenuForKey(event.key)) setOpen(false);
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  return <div className="user-menu" ref={menuRef}>
    <button type="button" className="user-menu-trigger" aria-label={labels.menu} {...userMenuButtonState(open)} onClick={() => setOpen((current) => !current)}>
      <span className="user-menu-avatar" aria-hidden="true">{userMenuAvatarInitial(displayName, username)}</span>
      <span className="user-menu-name">{displayName || username || "K"}</span>
      <span className="user-menu-caret" aria-hidden="true">⌄</span>
    </button>
    {open && <div className="user-menu-panel" role="menu" aria-label={labels.menu}>
      {profileHref ? <a role="menuitem" href={profileHref} onClick={() => setOpen(false)}>{labels.profile}</a> : <span role="menuitem" aria-disabled="true" className="user-menu-disabled">{labels.profileUnavailable}</span>}
      <a role="menuitem" href={`/settings/profile?lang=${language}`} onClick={() => setOpen(false)}>{labels.settings}</a>
      <a role="menuitem" href={`/bookmarks?lang=${language}`} onClick={() => setOpen(false)}>{labels.bookmarks}</a>
      <a role="menuitem" href={`/posts/new?lang=${language}`} onClick={() => setOpen(false)}>{labels.createPost}</a>
      <form action="/auth/signout" method="post"><button role="menuitem" type="submit">{labels.signOut}</button></form>
    </div>}
  </div>;
}
