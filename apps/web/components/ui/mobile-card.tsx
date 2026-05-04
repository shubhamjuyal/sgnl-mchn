import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function MobileCardList({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("md:hidden space-y-3", className)}>{children}</div>
  );
}

export function MobileCard({
  title,
  meta,
  children,
  footer,
  className,
}: {
  title?: ReactNode;
  meta?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-card/40 p-4 space-y-2",
        className,
      )}
    >
      {(title || meta) && (
        <div className="flex items-start justify-between gap-2">
          {title ? <div className="font-medium">{title}</div> : <div />}
          {meta && <div className="shrink-0 text-xs">{meta}</div>}
        </div>
      )}
      {children && (
        <dl className="grid grid-cols-[max-content_1fr] gap-x-3 gap-y-1 text-xs">
          {children}
        </dl>
      )}
      {footer && <div className="pt-1">{footer}</div>}
    </div>
  );
}

export function MobileCardField({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-foreground break-words min-w-0">{children}</dd>
    </>
  );
}

export function MobileCardEmpty({ children }: { children: ReactNode }) {
  return (
    <div className="md:hidden rounded-lg border border-border bg-card/40 px-4 py-8 text-center text-sm text-muted-foreground">
      {children}
    </div>
  );
}

export function DesktopOnly({ children }: { children: ReactNode }) {
  return <div className="hidden md:block">{children}</div>;
}
