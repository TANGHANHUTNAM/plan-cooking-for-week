import { BottomNav } from "@/components/bottom-nav";
import { SideNav } from "@/components/side-nav";

export default function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="flex h-dvh min-h-0 flex-col overflow-hidden lg:min-h-dvh lg:h-auto lg:flex-row lg:overflow-visible">
      <SideNav />
      {/* Bề rộng nội dung do từng trang tự đặt (mx-auto max-w-*) để mỗi trang cân đối riêng */}
      <main
        id="app-main"
        className="min-h-0 w-full min-w-0 flex-1 overflow-x-hidden overflow-y-auto px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-6 sm:px-6 lg:overflow-visible lg:px-10 lg:pb-14 lg:pt-10"
      >
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
