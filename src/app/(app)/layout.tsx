import { BottomNav } from "@/components/bottom-nav";
import { SideNav } from "@/components/side-nav";

export default function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="flex h-dvh min-h-0 flex-col overflow-hidden bg-background lg:min-h-dvh lg:h-auto lg:flex-row lg:overflow-visible">
      <SideNav />
      {/* Each page sets its own content width (mx-auto max-w-*) to keep the layout balanced */}
      <main
        id="app-main"
        className="min-h-0 w-full min-w-0 flex-1 overflow-x-hidden overflow-y-auto px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-6 sm:px-6 lg:overflow-visible lg:px-12 lg:pb-16 lg:pt-12"
      >
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
