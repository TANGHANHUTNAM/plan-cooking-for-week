import { BottomNav } from "@/components/bottom-nav";
import { SideNav } from "@/components/side-nav";

export default function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      <div className="lg:flex">
        <SideNav />
        <main className="mx-auto w-full min-w-0 max-w-md flex-1 px-4 pb-28 pt-6 lg:max-w-none lg:px-10 lg:pb-16 lg:pt-8">
          {children}
        </main>
      </div>
      <BottomNav />
    </>
  );
}
