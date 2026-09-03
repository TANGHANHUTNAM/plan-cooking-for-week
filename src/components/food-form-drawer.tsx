"use client";

import {
  useActionState,
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  createFood,
  deleteFood,
  updateFood,
  type FoodFormState,
} from "@/actions/foods";
import type { FoodDTO } from "@/lib/dto";
import { COOKING_METHODS } from "@/lib/validations";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
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
import { FOOD_TYPE_META, type FoodType } from "@/components/food-type";
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
  const [type, setType] = useState<FoodType>(food?.type ?? "MAIN");
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
    <form action={formAction}>
      {food ? <input type="hidden" name="id" value={food.id} /> : null}
      <input type="hidden" name="type" value={type} />
      <input type="hidden" name="favoriteScore" value={stars} />

      <FieldGroup className="gap-5">
        <Field>
          <FieldLabel htmlFor="food-name" className="text-sm">
            Tên món
          </FieldLabel>
          <Input
            id="food-name"
            name="name"
            defaultValue={food?.name ?? ""}
            placeholder="Ví dụ: Thịt kho trứng"
            required
            className="h-11 text-base"
          />
        </Field>

        <Field>
          <FieldLabel className="text-sm">Loại món</FieldLabel>
          <ToggleGroup
            type="single"
            value={type}
            onValueChange={(v) => v && setType(v as FoodType)}
            variant="outline"
            spacing={0}
            aria-label="Loại món"
            className="h-11 w-full"
          >
            {(Object.keys(FOOD_TYPE_META) as FoodType[]).map((val) => {
              const { label, icon: Icon } = FOOD_TYPE_META[val];
              return (
                <ToggleGroupItem
                  key={val}
                  value={val}
                  size="lg"
                  className="h-11 flex-1 gap-2 px-3.5 text-sm font-medium data-[state=on]:bg-secondary data-[state=on]:text-secondary-foreground"
                >
                  <Icon className="size-4" />
                  {label}
                </ToggleGroupItem>
              );
            })}
          </ToggleGroup>
          <FieldDescription>
            Món chính là món mặn ăn với cơm, món phụ là canh hoặc rau.
          </FieldDescription>
        </Field>

        <Field>
          <FieldLabel htmlFor="food-method" className="text-sm">
            Cách chế biến
          </FieldLabel>
          <Select
            name="cookingMethod"
            defaultValue={food?.cookingMethod ?? "Kho"}
          >
            <SelectTrigger id="food-method" size="lg" className="h-11 w-full">
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
          <FieldDescription>
            Dùng để tránh random hai bữa liền cùng một kiểu nấu.
          </FieldDescription>
        </Field>

        <Field>
          <FieldLabel htmlFor="food-ingredients" className="text-sm">
            Nguyên liệu cần mua
          </FieldLabel>
          <TagInput
            id="food-ingredients"
            name="ingredients"
            value={ingredients}
            onChange={setIngredients}
            placeholder="Thịt heo, trứng vịt…"
          />
          <FieldDescription>
            Gõ xong nhấn Enter hoặc dấu phẩy để tách từng nguyên liệu.
          </FieldDescription>
        </Field>

        <Field>
          <FieldLabel className="text-sm">Mức yêu thích</FieldLabel>
          <StarRating value={stars} onChange={setStars} />
          <FieldDescription>
            Món điểm cao được random ra nhiều hơn.
          </FieldDescription>
        </Field>

        <Field>
          <FieldLabel htmlFor="food-note" className="text-sm">
            Ghi chú
          </FieldLabel>
          <Textarea
            id="food-note"
            name="note"
            defaultValue={food?.note ?? ""}
            placeholder="Ví dụ: kho lửa nhỏ 45 phút"
            rows={2}
            className="text-base"
          />
        </Field>

        {state.error ? <FieldError>{state.error}</FieldError> : null}

        <Button
          type="submit"
          size="lg"
          disabled={pending || deleting}
          className="h-11 w-full text-sm font-semibold"
        >
          {pending ? <Spinner /> : null}
          {food ? "Lưu thay đổi" : "Thêm món"}
        </Button>

        {food ? (
          <>
            <Button
              type="button"
              variant="ghost"
              size="lg"
              disabled={deleting || pending}
              onClick={() => setConfirmDelete(true)}
              className="mx-auto h-11 text-sm text-destructive hover:bg-destructive/10 hover:text-destructive lg:h-8"
            >
              {deleting ? <Spinner /> : <Trash2 />}
              Xóa món này
            </Button>

            <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
              <AlertDialogContent className="max-w-[calc(100vw_-_2rem)] sm:max-w-sm">
                <AlertDialogHeader>
                  <AlertDialogTitle>Xóa “{food.name}”?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Món sẽ bị gỡ khỏi mọi lịch tuần đang có và không khôi phục
                    lại được.
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
      </FieldGroup>
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
      description={
        food
          ? "Sửa xong bấm Lưu thay đổi, lịch tuần sẽ cập nhật theo."
          : "Món mới sẽ được đưa vào danh sách random ngay."
      }
    >
      <FoodForm
        key={food?.id ?? "new"}
        food={food}
        onSaved={() => onOpenChange(false)}
      />
    </ResponsiveSheet>
  );
}
