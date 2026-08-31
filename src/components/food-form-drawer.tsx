"use client";

import {
  useActionState,
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  createFood,
  deleteFood,
  updateFood,
  type FoodFormState,
} from "@/actions/foods";
import type { FoodDTO } from "@/lib/dto";
import { COOKING_METHODS } from "@/lib/validations";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ResponsiveSheet } from "@/components/responsive-sheet";
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
import { StarRating } from "@/components/star-rating";
import { TagInput } from "@/components/tag-input";

function FoodForm({
  food,
  onSaved,
}: {
  food: FoodDTO | null;
  onSaved: () => void;
}) {
  const [state, formAction, pending] = useActionState<FoodFormState, FormData>(
    food ? updateFood : createFood,
    {}
  );
  const [type, setType] = useState<"MAIN" | "SIDE">(food?.type ?? "MAIN");
  const [ingredients, setIngredients] = useState<string[]>(
    food?.ingredients ?? []
  );
  const [stars, setStars] = useState(food?.favoriteScore ?? 0);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, startDelete] = useTransition();
  const handledSave = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (state.savedAt && state.savedAt !== handledSave.current) {
      handledSave.current = state.savedAt;
      toast.success(food ? "Đã cập nhật món" : "Đã thêm món mới");
      onSaved();
    }
  }, [state.savedAt, food, onSaved]);

  const methods = COOKING_METHODS.includes(
    (food?.cookingMethod ?? "") as (typeof COOKING_METHODS)[number]
  )
    ? COOKING_METHODS
    : food
      ? [food.cookingMethod, ...COOKING_METHODS]
      : COOKING_METHODS;

  const onDelete = () =>
    startDelete(async () => {
      if (!food) return;
      const res = await deleteFood(food.id);
      if (res.error) toast.error(res.error);
      else {
        toast.success("Đã xóa món");
        onSaved();
      }
    });

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {food ? <input type="hidden" name="id" value={food.id} /> : null}
      <input type="hidden" name="type" value={type} />
      <input type="hidden" name="favoriteScore" value={stars} />

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="food-name">Tên món</Label>
        <Input
          id="food-name"
          name="name"
          defaultValue={food?.name ?? ""}
          placeholder="VD: Thịt kho trứng"
          required
          className="h-11 text-base"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>Loại món</Label>
        <div className="grid grid-cols-2 gap-1 rounded-full bg-muted p-1">
          {(
            [
              ["MAIN", "Món chính"],
              ["SIDE", "Món phụ"],
            ] as const
          ).map(([val, label]) => (
            <button
              key={val}
              type="button"
              onClick={() => setType(val)}
              className={cn(
                "h-9 rounded-full text-sm font-semibold transition-colors",
                type === val
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground"
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>Cách chế biến</Label>
        <Select
          name="cookingMethod"
          defaultValue={food?.cookingMethod ?? "Kho"}
        >
          <SelectTrigger className="h-11 w-full text-base">
            <SelectValue placeholder="Chọn cách chế biến" />
          </SelectTrigger>
          <SelectContent>
            {methods.map((m) => (
              <SelectItem key={m} value={m}>
                {m}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>Nguyên liệu cần chuẩn bị</Label>
        <TagInput
          name="ingredients"
          value={ingredients}
          onChange={setIngredients}
          placeholder="VD: Thịt heo, trứng vịt…"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>Mức yêu thích</Label>
        <StarRating value={stars} onChange={setStars} />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="food-note">Ghi chú</Label>
        <Textarea
          id="food-note"
          name="note"
          defaultValue={food?.note ?? ""}
          placeholder="VD: kho lửa nhỏ 45 phút…"
          rows={2}
          className="text-base"
        />
      </div>

      {state.error ? (
        <p role="alert" className="text-sm font-medium text-destructive">
          {state.error}
        </p>
      ) : null}

      <Button
        type="submit"
        disabled={pending || deleting}
        className="h-11 w-full text-base font-semibold"
      >
        {pending ? <Loader2 className="size-4 animate-spin" /> : null}
        {food ? "Lưu thay đổi" : "Thêm món"}
      </Button>

      {food ? (
        <>
          <button
            type="button"
            disabled={deleting || pending}
            onClick={() => setConfirmDelete(true)}
            className="mx-auto flex items-center gap-1.5 py-1 text-sm font-medium text-destructive transition-opacity hover:opacity-80 disabled:opacity-50"
          >
            {deleting ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Trash2 className="size-4" />
            )}
            Xóa món này
          </button>

          <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
            <AlertDialogContent className="max-w-[calc(100vw_-_2rem)] rounded-2xl sm:max-w-sm">
              <AlertDialogHeader>
                <AlertDialogTitle>Xóa “{food.name}”?</AlertDialogTitle>
                <AlertDialogDescription>
                  Món sẽ bị gỡ khỏi mọi lịch tuần đang có và không thể khôi
                  phục.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Hủy</AlertDialogCancel>
                <AlertDialogAction onClick={onDelete} variant="destructive">
                  Xóa món
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      ) : null}
    </form>
  );
}

export function FoodFormDrawer({
  open,
  onOpenChange,
  food,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  food: FoodDTO | null;
}) {
  return (
    <ResponsiveSheet
      open={open}
      onOpenChange={onOpenChange}
      title={food ? "Sửa món ăn" : "Thêm món mới"}
    >
      <FoodForm
        key={food?.id ?? "new"}
        food={food}
        onSaved={() => onOpenChange(false)}
      />
    </ResponsiveSheet>
  );
}
