"use client";

import { KeyRound, LogIn } from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button, ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/primitives";
import { PageSpinner } from "@/components/ui/page-spinner";
import type { Me } from "@/types/api";

/** Renders children for signed-in users; otherwise prompts login in place. */
export function RequireAuth({
  children,
  title = "Log in to continue",
  subtitle = "Use Google or your mobile number. Browsing never needs an account.",
}: {
  children: (me: Me) => ReactNode;
  title?: string;
  subtitle?: string;
}) {
  const { ready, user, me, requireLogin } = useAuth();
  const asked = useRef(false);

  useEffect(() => {
    if (ready && !user && !asked.current) {
      asked.current = true;
      void requireLogin({ title, subtitle });
    }
  }, [ready, user, requireLogin, title, subtitle]);

  if (!ready || (user && !me)) return <PageSpinner />;
  if (!user || !me) {
    return (
      <div className="container-page py-12">
        <EmptyState
          icon={<LogIn className="size-7" />}
          title={title}
          body={subtitle}
          action={<Button size="sm" onClick={() => requireLogin({ title, subtitle })}>Log in</Button>}
        />
      </div>
    );
  }
  return <>{children(me)}</>;
}

/** Signed in AND owner tools on. */
export function RequireOwner({ children }: { children: (me: Me) => ReactNode }) {
  return (
    <RequireAuth title="Log in to manage your listings" subtitle="Owner tools live on your regular EasyStay account.">
      {(me) =>
        me.ownerToolsOn ? (
          children(me)
        ) : (
          <div className="container-page py-12">
            <EmptyState
              icon={<KeyRound className="size-7" />}
              title="Turn on owner tools"
              body="Add the mobile number seekers should call to list properties. You'll keep browsing and contacting owners as before."
              action={<ButtonLink href="/owner/setup" size="sm">Turn on owner tools</ButtonLink>}
            />
          </div>
        )
      }
    </RequireAuth>
  );
}
