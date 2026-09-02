"use client";

import { useState, useTransition } from "react";
import {
  ArrowDownWideNarrow,
  CookingPot,
  FileUp,
  Plus,
  Search,
  SearchX,
  Soup,
  Trash2,
  UtensilsCrossed,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { deleteFood } from "@/actions/foods";
import type { FoodDTO } from "@/lib/dto";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
import { FOOD_TYPE_META, FoodTypeTile } from "@/components/food-type";
import { RatingStars } from "@/components/rating-stars";
import { FoodFormDrawer } from "@/components/food-form-drawer";
import { ImportFoodsDialog } from "@/components/import-foods-dialog";

const FILTERS = [
  ["ALL", "Tất cả", null],
  ["MAIN", "Món chính", UtensilsCrossed],
  ["SIDE", "Món phụ", Soup],
] as const;

type Filter = (typeof FILTERS)[number][0];

const SORTS = [
  ["NAME", "Theo tên"],
  ["RATING", "Thích nhất"],
] as const;

type Sort = (typeof SORTS)[number][0];

function FoodCard({
  food,
  onEdit,
  onDelete,
}: {
  food: FoodDTO;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <Card
      size="sm"
      className="group relative h-full transition-colors hover:ring-primary/40"
    >
      {/* nút phủ toàn thẻ: bấm chỗ nào cũng mở form sửa món */}
      <button
        type="button"
        onClick={onEdit}
        aria-label={`Sửa món ${food.name}`}
        className="absolute inset-0 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
      <CardContent className="pointer-events-none relative flex flex-1 flex-col gap-3">
        <div className="flex items-start gap-3">
          <FoodTypeTile
            type={food.type}
            className="size-9"
            iconClassName="size-4.5"
          />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold leading-snug">{food.name}</p>
            <p className="mt-0.5 truncate text-xs text-muted-foreground">
              {food.cookingMethod}
            </p>
          </div>
        </div>

        <div className="mt-auto flex items-center justify-between gap-2">
          <RatingStars value={food.favoriteScore} />
          <div className="flex items-center gap-2">
            <span className="text-xs tabular-nums text-muted-foreground">
              {food.totalCooked > 0
                ? `Đã nấu ${food.totalCooked} lần`
                : "Chưa nấu lần nào"}
            </span>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Xóa món ${food.name}`}
                  onClick={onDelete}
                  className="pointer-events-auto -mr-1 size-11 text-muted-foreground/60 hover:bg-destructive/10 hover:text-destructive lg:size-6"
                >
                  <Trash2 />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Xóa món</TooltipContent>
            </Tooltip>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function FoodSection({
  type,
  foods,
  onEdit,
  onDelete,
}: {
  type: "MAIN" | "SIDE";
  foods: FoodDTO[];
  onEdit: (food: FoodDTO) => void;
  onDelete: (food: FoodDTO) => void;
}) {
  if (foods.length === 0) return null;
  return (
    <section>
      <div className="mb-3 flex items-center gap-2">
        <FoodTypeTile type={type} className="size-7" iconClassName="size-4" />
        <h2 className="font-heading text-base font-semibold tracking-[-0.01em]">
          {FOOD_TYPE_META[type].label}
        </h2>
        <Badge variant="secondary" className="tabular-nums">
          {foods.length}
        </Badge>
      </div>
      <div className="grid auto-rows-fr items-stretch gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {foods.map((food) => (
          <FoodCard
            key={food.id}
            food={food}
            onEdit={() => onEdit(food)}
            onDelete={() => onDelete(food)}
          />
        ))}
      </div>
    </section>
  );
}

export function FoodsScreen({ foods }: { foods: FoodDTO[] }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("ALL");
  const [sort, setSort] = useState<Sort>("NAME");
  const [drawer, setDrawer] = useState<{ open: boolean; food: FoodDTO | null }>(
    {
      open: false,
      food: null,
    }
  );
  const [importOpen, setImportOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<FoodDTO | null>(null);
  const [deleting, startDeleting] = useTransition();

  const openCreate = () => setDrawer({ open: true, food: null });
  const openEdit = (food: FoodDTO) => setDrawer({ open: true, food });

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

  const mains = sorted.filter((f) => f.type === "MAIN");
  const sides = sorted.filter((f) => f.type === "SIDE");

  return (
    <div className="mx-auto w-full max-w-6xl">
      <PageHeader
        title="Món ăn"
        description={`${foods.length} món đã lưu. Càng nhiều món thì thực đơn random càng ít lặp lại.`}
        actions={
          <>
            <Button
              variant="outline"
              size="lg"
              onClick={() => setImportOpen(true)}
              className="h-11 lg:h-10"
            >
              <FileUp />
              Nhập Excel
            </Button>
            {foods.length > 0 ? (
              <Button
                size="lg"
                onClick={openCreate}
                className="hidden h-10 font-semibold lg:inline-flex"
              >
                <Plus />
                Thêm món
              </Button>
            ) : null}
          </>
        }
      />

      {foods.length === 0 ? (
        <EmptyState
          icon={<CookingPot />}
          title="Chưa có món nào"
          description="Thêm từng món một, hoặc nhập cả danh sách có sẵn từ file Excel."
        >
          <Button
            size="lg"
            onClick={openCreate}
            className="h-11 px-6 text-sm font-semibold"
          >
            <Plus />
            Thêm món đầu tiên
          </Button>
          <Button
            variant="outline"
            size="lg"
            onClick={() => setImportOpen(true)}
            className="h-11 px-6 text-sm font-semibold"
          >
            <FileUp />
            Nhập từ Excel
          </Button>
        </EmptyState>
      ) : (
        <>
          <div className="mb-5 flex flex-wrap items-center gap-x-3 gap-y-2.5">
            <InputGroup className="h-11 min-w-44 flex-1 xl:h-10 xl:w-72 xl:flex-none">
              <InputGroupAddon>
                <Search />
              </InputGroupAddon>
              <InputGroupInput
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Tìm món hoặc cách chế biến"
                aria-label="Tìm món ăn"
                className="h-11 text-sm lg:h-10"
              />
              {query ? (
                <InputGroupAddon align="inline-end">
                  <InputGroupButton
                    size="icon-xs"
                    aria-label="Xóa từ khóa tìm"
                    onClick={() => setQuery("")}
                    className="size-11 lg:size-6"
                  >
                    <X />
                  </InputGroupButton>
                </InputGroupAddon>
              ) : null}
            </InputGroup>

            <Select value={sort} onValueChange={(v) => setSort(v as Sort)}>
              <SelectTrigger
                size="lg"
                aria-label="Sắp xếp món ăn"
                className="h-11 w-[10.5rem] shrink-0 text-[13px] font-medium sm:order-3 lg:h-10"
              >
                <ArrowDownWideNarrow className="size-4 text-muted-foreground" />
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

            <ToggleGroup
              type="single"
              value={filter}
              onValueChange={(v) => v && setFilter(v as Filter)}
              variant="outline"
              spacing={0}
              className="h-11 sm:order-2 xl:ml-auto lg:h-10"
            >
              {FILTERS.map(([val, label, Icon]) => (
                <ToggleGroupItem
                  key={val}
                  value={val}
                  size="lg"
                  className="h-11 gap-1.5 px-4 text-[13px] font-medium data-[state=on]:bg-secondary data-[state=on]:text-secondary-foreground lg:h-10"
                >
                  {Icon ? <Icon className="size-3.5" /> : null}
                  {label}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </div>

          {sorted.length === 0 ? (
            <EmptyState
              icon={<SearchX />}
              title="Không có món nào khớp"
              description="Thử bỏ bớt từ khóa, hoặc chuyển bộ lọc về Tất cả."
            >
              <Button
                variant="outline"
                size="lg"
                className="h-11 lg:h-10"
                onClick={() => {
                  setQuery("");
                  setFilter("ALL");
                }}
              >
                Xóa bộ lọc
              </Button>
            </EmptyState>
          ) : (
            <div className="flex flex-col gap-7">
              <FoodSection
                type="MAIN"
                foods={mains}
                onEdit={openEdit}
                onDelete={setDeleteTarget}
              />
              <FoodSection
                type="SIDE"
                foods={sides}
                onEdit={openEdit}
                onDelete={setDeleteTarget}
              />
            </div>
          )}
        </>
      )}

      {foods.length > 0 ? (
        <Button
          size="icon"
          aria-label="Thêm món mới"
          onClick={openCreate}
          className="fixed bottom-[calc(env(safe-area-inset-bottom)+4.75rem)] right-4 z-30 size-14 rounded-full shadow-lg [&_svg:not([class*='size-'])]:size-6 lg:hidden"
        >
          <Plus />
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
        <AlertDialogContent className="max-w-[calc(100vw_-_2rem)] sm:max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa “{deleteTarget?.name}”?</AlertDialogTitle>
            <AlertDialogDescription>
              Món sẽ bị gỡ khỏi mọi lịch tuần đang có và không khôi phục lại
              được.
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
              {deleting ? <Spinner /> : null}
              Xóa món
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
