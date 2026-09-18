"use client";

import { useRef, type ReactNode } from "react";
import { useIsDesktop } from "@/lib/use-is-desktop";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";

const FIRST_FOCUSABLE_SELECTOR = [
  "button:not([disabled])",
  "a[href]",
  'input:not([disabled]):not([type="hidden"])',
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[contenteditable="true"]',
  '[tabindex]:not([tabindex="-1"])',
].join(",");

function isRestorableFocusTarget(
  element: HTMLElement | null
): element is HTMLElement {
  return Boolean(
    element &&
    element.isConnected &&
    element.tabIndex >= 0 &&
    !element.matches(":disabled") &&
    element.getAttribute("aria-disabled") !== "true" &&
    element.getClientRects().length > 0
  );
}

/**
 * Bottom sheet on mobile/tablet, centered dialog on desktop.
 * Shared API for SwapSheet and the food form.
 */
export function ResponsiveSheet({
  open,
  onOpenChange,
  icon,
  title,
  description,
  tone = "default",
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  icon?: ReactNode;
  title: string;
  description?: ReactNode;
  tone?: "default" | "chest";
  children: ReactNode;
}) {
  const isDesktop = useIsDesktop();
  const isChest = tone === "chest";
  const returnFocusRef = useRef<HTMLElement | null>(null);

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className={cn(
            "flex max-h-[86dvh] flex-col gap-0 overflow-hidden p-0 sm:max-w-xl",
            isChest &&
              "food-chest-dialog border-chest-border bg-chest-bg text-chest-cream ring-chest-border/60 sm:max-w-4xl"
          )}
          {...(description ? {} : { "aria-describedby": undefined })}
        >
          <DialogHeader
            className={cn(
              "shrink-0 border-b border-border px-6 py-4 text-left",
              isChest && "border-chest-border/70 bg-chest-bg"
            )}
          >
            <DialogTitle
              className={cn(
                "flex items-center gap-2 text-base",
                isChest && "font-serif text-chest-cream"
              )}
            >
              {icon}
              {title}
            </DialogTitle>
            {description ? (
              <DialogDescription
                className={isChest ? "text-chest-muted" : undefined}
              >
                {description}
              </DialogDescription>
            ) : null}
          </DialogHeader>
          <div
            className={cn(
              "scrollbar-thin overflow-y-auto px-6 py-5",
              isChest && "bg-chest-bg px-4 sm:px-6"
            )}
          >
            {children}
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange} repositionInputs={false}>
      <DrawerContent
        className={cn(
          "max-h-[94dvh]",
          isChest && "before:border-chest-border before:bg-chest-bg"
        )}
        onOpenAutoFocus={(event) => {
          const content = event.currentTarget;
          if (!(content instanceof HTMLElement)) return;

          const opener = document.activeElement;
          if (
            opener instanceof HTMLElement &&
            !content.contains(opener) &&
            isRestorableFocusTarget(opener)
          ) {
            returnFocusRef.current = opener;
          }

          const firstFocusable = content.querySelector<HTMLElement>(
            FIRST_FOCUSABLE_SELECTOR
          );
          if (!firstFocusable) return;

          // Vaul disables its default auto-focus. Seed Radix's focus scope
          // explicitly so its loop/trap can keep Tab inside the drawer.
          event.preventDefault();
          firstFocusable.focus({ preventScroll: true });
        }}
        onCloseAutoFocus={(event) => {
          event.preventDefault();

          const opener = returnFocusRef.current;
          returnFocusRef.current = null;
          if (isRestorableFocusTarget(opener)) {
            opener.focus({ preventScroll: true });
          }
        }}
      >
        <div className="scrollbar-thin mx-auto w-full max-w-md overflow-y-auto px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
          <DrawerHeader className="px-0 pt-1 pb-4 group-data-[vaul-drawer-direction=bottom]/drawer-content:text-left">
            <DrawerTitle
              className={cn(
                "flex items-center gap-2 text-base",
                isChest && "font-serif text-chest-cream"
              )}
            >
              {icon}
              {title}
            </DrawerTitle>
            {description ? (
              <DrawerDescription
                className={isChest ? "text-chest-muted" : undefined}
              >
                {description}
              </DrawerDescription>
            ) : null}
          </DrawerHeader>
          <div className={cn(isChest && "text-chest-cream")}>{children}</div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
