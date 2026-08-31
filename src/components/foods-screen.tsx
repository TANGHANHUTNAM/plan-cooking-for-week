"use client";

import { useState, useTransition } from "react";
import {
  ArrowDownWideNarrow,
  CookingPot,
  FileUp,
  Loader2,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { deleteFood } from "@/actions/foods";
import type { FoodDTO } from "@/lib/dto";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { FoodFormDrawer } from "@/components/food-form-drawer";
import { ImportFoodsDialog } from "@/components/import-foods-dialog";

const FILTERS = [
  ["ALL", "Tất cả"],
  ["MAIN", "Món chính"],
  ["SIDE", "Món phụ"],
] as const;

type Filter = (typeof FILTERS)[number][0];

const SORTS = [
  ["NAME", "Tên A→Z"],
  ["RATING", "Rating cao nhất"],
] as const;

type Sort = (typeof SORTS)[number][0];

export function FoodsScreen({ foods }: { foods: FoodDTO[] }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("ALL");
  const [sort, setSort] = useState<Sort>("NAME");
  const [drawer, setDrawer] = useState<{ open: boolean; food: FoodDTO | null }>({
    open: false,
    food: null,
  });
  const [importOpen, setImportOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<FoodDTO | null>(null);
  const [deleting, startDeleting] = useTransition();

  const openCreate = () => setDrawer({ open: true, food: null });

  const confirmDelete = () => {
    const target = deleteTarget;
    if (!target) return;
    startDeleting(async () => {
      const res = await deleteFood(target.id);
      if (res.error) toast.error(res.error);
      else toast.success(`Đã xóa “${target.name}”`);
      setDeleteTarget(null);
    });
  };

  const q = query.trim().toLowerCase();
  const filtered = foods.filter((f) => {
    if (filter !== "ALL" && f.type !== filter) return false;
    if (!q) return true;
    return (
      f.name.toLowerCase().includes(q) ||
      f.cookingMethod.toLowerCase().includes(q)
    );
  });
  // rating cao trước, đồng hạng thì theo tên; mặc định giữ thứ tự tên từ server
  const sorted =
    sort === "RATING"
      ? [...filtered].sort(
          (a, b) =>
            b.favoriteScore - a.favoriteScore ||
            a.name.localeCompare(b.name, "vi", { sensitivity: "base" })
        )
      : filtered;

  return (
    <div className="w-full lg:max-w-5xl">
      <PageHeader
        eyebrow={`${foods.length} món đã lưu`}
        title="Món ăn"
        action={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => setImportOpen(true)}
              className="h-9 px-3 text-[13px] font-semibold lg:h-10 lg:px-4 lg:text-sm"
            >
              <FileUp className="size-4" />
              Nhập Excel
            </Button>
            {foods.length > 0 ? (
              <Button
                onClick={openCreate}
                className="hidden h-10 px-4 font-semibold lg:inline-flex"
              >
                <Plus className="size-4" />
                Thêm món
              </Button>
            ) : null}
          </div>
        }
      />

      {foods.length === 0 ? (
        <EmptyState
          icon={<CookingPot className="size-7" />}
          title="Chưa có món nào"
          description="Thêm từng món, hoặc nhập nhanh cả danh sách từ file Excel."
          className="lg:max-w-xl"
        >
          <Button onClick={openCreate} className="h-11 px-6 text-base font-semibold">
            <Plus className="size-5" />
            Thêm món đầu tiên
          </Button>
          <Button
            variant="outline"
            onClick={() => setImportOpen(true)}
            className="h-11 px-6 font-semibold"
          >
            <FileUp className="size-4" />
            Nhập từ Excel
          </Button>
        </EmptyState>
      ) : (
        <>
          <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center">
            <div className="relative flex-1 md:max-w-sm">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Tìm món hoặc cách chế biến…"
                className="h-11 bg-card pl-9 text-base"
              />
            </div>

            <div className="flex items-center gap-2">
              <div className="grid flex-1 grid-cols-3 gap-1 rounded-full bg-muted p-1 md:inline-grid md:flex-none">
                {FILTERS.map(([val, label]) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setFilter(val)}
                    className={cn(
                      "h-8 rounded-full px-3 text-[13px] font-semibold transition-colors md:px-4",
                      filter === val
                        ? "bg-card text-foreground shadow-sm"
                        : "text-muted-foreground"
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <Select
                value={sort}
                onValueChange={(v) => setSort(v as Sort)}
              >
                <SelectTrigger
                  aria-label="Sắp xếp món ăn"
                  className="h-9 shrink-0 rounded-full border-border bg-card px-3 text-[13px] font-semibold text-muted-foreground"
                >
                  <ArrowDownWideNarrow className="size-3.5" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SORTS.map(([val, label]) => (
                    <SelectItem key={val} value={val}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {sorted.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              Không tìm thấy món nào phù hợp.
            </p>
          ) : (
            <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card shadow-sm md:grid md:grid-cols-2 md:gap-3 md:divide-y-0 md:overflow-visible md:rounded-none md:border-0 md:bg-transparent md:shadow-none xl:grid-cols-3">
              {sorted.map((food) => (
                <div
                  key={food.id}
                  className="flex items-center gap-1 pr-2 transition-colors hover:bg-muted/50 md:rounded-xl md:border md:border-border md:bg-card md:shadow-sm md:hover:border-primary/40 md:hover:bg-card"
                >
                  <button
                    type="button"
                    onClick={() => setDrawer({ open: true, food })}
                    className="flex min-w-0 flex-1 items-center gap-3 py-3 pl-4 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[15px] font-semibold">
                        {food.name}
                      </span>
                      <span className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-xs text-muted-foreground">
                        <span>{food.cookingMethod}</span>
                        {food.favoriteScore > 0 ? (
                          <span className="font-medium text-amber-600 dark:text-amber-400">
                            ★ {food.favoriteScore}
                          </span>
                        ) : null}
                        {food.totalCooked > 0 ? (
                          <span>· đã nấu {food.totalCooked} lần</span>
                        ) : (
                          <span>· chưa nấu lần nào</span>
                        )}
                      </span>
                    </span>
                    {filter === "ALL" ? (
                      <Badge
                        variant={food.type === "MAIN" ? "secondary" : "outline"}
                        className="shrink-0 rounded-full text-[10.5px]"
                      >
                        {food.type === "MAIN" ? "Chính" : "Phụ"}
                      </Badge>
                    ) : null}
                  </button>

                  <button
                    type="button"
                    aria-label={`Xóa ${food.name}`}
                    onClick={() => setDeleteTarget(food)}
                    className="grid size-9 shrink-0 place-items-center rounded-full text-muted-foreground/60 transition-colors hover:bg-destructive/10 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {foods.length > 0 ? (
        <Button
          size="icon"
          aria-label="Thêm món mới"
          onClick={openCreate}
          className="fixed bottom-[calc(env(safe-area-inset-bottom)+4.75rem)] right-[max(1rem,calc(50vw_-_13rem))] z-30 size-14 rounded-full shadow-lg lg:hidden"
        >
          <Plus className="size-6" />
        </Button>
      ) : null}

      <FoodFormDrawer
        open={drawer.open}
        onOpenChange={(open) =>
          setDrawer((d) => ({ open, food: open ? d.food : null }))
        }
        food={drawer.food}
      />

      <ImportFoodsDialog open={importOpen} onOpenChange={setImportOpen} />

      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open && !deleting) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent className="max-w-[calc(100vw_-_2rem)] rounded-2xl sm:max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa “{deleteTarget?.name}”?</AlertDialogTitle>
            <AlertDialogDescription>
              Món sẽ bị gỡ khỏi mọi lịch tuần đang có và không thể khôi phục.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Hủy</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault(); // giữ dialog mở tới khi xóa xong
                confirmDelete();
              }}
              disabled={deleting}
              variant="destructive"
            >
              {deleting ? <Loader2 className="size-4 animate-spin" /> : null}
              Xóa món
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
