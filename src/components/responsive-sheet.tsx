"use client";

import { useRef, type ReactNode } from "react";
import { useIsDesktop } from "@/lib/use-is-desktop";
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
 * Bottom sheet trên mobile/tablet, dialog giữa màn hình trên desktop.
 * Cùng một API cho SwapSheet và form món ăn.
 */
export function ResponsiveSheet({
  open,
  onOpenChange,
  icon,
  title,
  description,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  icon?: ReactNode;
  title: string;
  description?: ReactNode;
  children: ReactNode;
}) {
  const isDesktop = useIsDesktop();
  const returnFocusRef = useRef<HTMLElement | null>(null);

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className="flex max-h-[86dvh] flex-col gap-0 overflow-hidden p-0 sm:max-w-md"
          {...(description ? {} : { "aria-describedby": undefined })}
        >
          <DialogHeader className="shrink-0 border-b border-border px-6 py-4 text-left">
            <DialogTitle className="flex items-center gap-2 text-base">
              {icon}
              {title}
            </DialogTitle>
            {description ? (
              <DialogDescription>{description}</DialogDescription>
            ) : null}
          </DialogHeader>
          <div className="scrollbar-thin overflow-y-auto px-6 py-5">
            {children}
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange} repositionInputs={false}>
      <DrawerContent
        className="max-h-[94dvh]"
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
            <DrawerTitle className="flex items-center gap-2 text-base">
              {icon}
              {title}
            </DrawerTitle>
            {description ? (
              <DrawerDescription>{description}</DrawerDescription>
            ) : null}
          </DrawerHeader>
          {children}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
