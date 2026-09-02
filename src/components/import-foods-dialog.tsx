"use client";

import { useRef, useState, useTransition } from "react";
import { Download, FileUp } from "lucide-react";
import { toast } from "sonner";
import { importFoods, parseImportExcel } from "@/actions/import";
import type { ImportFoodData, PreviewRow } from "@/lib/import-foods";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Spinner } from "@/components/ui/spinner";
import { FoodTypeTile } from "@/components/food-type";
import { ResponsiveSheet } from "@/components/responsive-sheet";

/** "Kho, 4 nguyên liệu" — loại món đã có ô biểu tượng bên trái nên không nhắc lại. */
function rowDetail(data: ImportFoodData) {
  const parts = [data.cookingMethod];
  if (data.ingredients.length > 0) {
    parts.push(`${data.ingredients.length} nguyên liệu`);
  }
  if (data.favoriteScore > 0) {
    parts.push(`${data.favoriteScore} sao`);
  }
  return parts.join(", ");
}

export function ImportFoodsDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [rows, setRows] = useState<PreviewRow[] | null>(null);
  const [parsing, startParsing] = useTransition();
  const [importing, startImporting] = useTransition();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const validRows = rows?.filter((r) => r.status === "valid") ?? [];
  const duplicateCount =
    rows?.filter((r) => r.status === "duplicate").length ?? 0;
  const errorCount = rows?.filter((r) => r.status === "error").length ?? 0;

  const reset = () => {
    setRows(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  const handleFile = (file: File | undefined) => {
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);
    startParsing(async () => {
      const res = await parseImportExcel(formData);
      if (res.error) {
        toast.error(res.error);
        reset();
      } else {
        setRows(res.rows ?? []);
      }
    });
  };

  const handleImport = () =>
    startImporting(async () => {
      const res = await importFoods(validRows.map((r) => r.data));
      if (res.error) {
        toast.error(res.error);
        return;
      }
      toast.success(
        `Đã nhập ${res.imported} món` +
          (res.skipped ? `, bỏ qua ${res.skipped} món trùng` : "")
      );
      handleOpenChange(false);
    });

  return (
    <ResponsiveSheet
      open={open}
      onOpenChange={handleOpenChange}
      title="Nhập món từ Excel"
      description="Điền món vào file mẫu rồi tải lên. Bạn xem trước rồi mới nhập."
    >
      <div className="flex flex-col gap-5">
        {rows === null ? (
          <>
            <ol className="flex flex-col gap-2.5 text-sm text-muted-foreground">
              {[
                <>
                  Tải file mẫu về, điền món vào sheet{" "}
                  <span className="font-medium text-foreground">“Món ăn”</span>,
                  mỗi dòng một món.
                </>,
                <>
                  Nguyên liệu viết chung một ô, cách nhau bằng{" "}
                  <span className="font-medium text-foreground">dấu phẩy</span>.
                </>,
                <>Chọn file để xem trước. Món đã có sẵn sẽ tự bỏ qua.</>,
              ].map((text, i) => (
                <li key={i} className="flex gap-2.5">
                  <span className="grid size-5 shrink-0 place-items-center rounded-full bg-secondary text-[11px] font-bold tabular-nums text-secondary-foreground">
                    {i + 1}
                  </span>
                  <span className="min-w-0 flex-1 pt-px">{text}</span>
                </li>
              ))}
            </ol>

            <div className="flex flex-col gap-2">
              <Button
                asChild
                variant="outline"
                size="lg"
                className="h-11 text-sm font-semibold"
              >
                <a href="/foods/template" download>
                  <Download />
                  Tải file mẫu (.xlsx)
                </a>
              </Button>

              <Button
                asChild
                size="lg"
                disabled={parsing}
                className="h-11 text-sm font-semibold"
              >
                <label className="cursor-pointer">
                  {parsing ? <Spinner /> : <FileUp />}
                  {parsing ? "Đang đọc file…" : "Chọn file đã điền"}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx"
                    className="sr-only"
                    disabled={parsing}
                    onChange={(e) => handleFile(e.target.files?.[0])}
                  />
                </label>
              </Button>
            </div>
          </>
        ) : (
          <>
            <div className="flex flex-wrap gap-1.5">
              <Badge variant="secondary" className="h-6 px-2.5">
                {validRows.length} món sẽ nhập
              </Badge>
              {duplicateCount > 0 ? (
                <Badge variant="outline" className="h-6 px-2.5">
                  {duplicateCount} món đã có
                </Badge>
              ) : null}
              {errorCount > 0 ? (
                <Badge variant="destructive" className="h-6 px-2.5">
                  {errorCount} dòng lỗi
                </Badge>
              ) : null}
            </div>

            <ScrollArea className="scrollbar-thin -mr-2 max-h-64 pr-2">
              <ItemGroup className="gap-1.5">
                {rows.map((row) => (
                  <Item
                    key={row.rowNumber}
                    size="xs"
                    variant="outline"
                    className={cn(row.status === "duplicate" && "opacity-60")}
                  >
                    {row.status === "error" ? null : (
                      <ItemMedia>
                        <FoodTypeTile
                          type={row.data.type}
                          className="size-7"
                          iconClassName="size-3.5"
                        />
                      </ItemMedia>
                    )}
                    <ItemContent>
                      {row.status === "error" ? (
                        <>
                          <ItemTitle className="text-destructive">
                            Dòng {row.rowNumber}
                            {row.name ? ` — ${row.name}` : ""}
                          </ItemTitle>
                          <ItemDescription className="text-destructive/90">
                            {row.message}
                          </ItemDescription>
                        </>
                      ) : (
                        <>
                          <ItemTitle className="text-sm">
                            {row.data.name}
                          </ItemTitle>
                          <ItemDescription>
                            {rowDetail(row.data)}
                          </ItemDescription>
                        </>
                      )}
                    </ItemContent>
                    {row.status === "duplicate" ? (
                      <Badge variant="outline">Đã có</Badge>
                    ) : null}
                  </Item>
                ))}
              </ItemGroup>
            </ScrollArea>

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="lg"
                onClick={reset}
                disabled={importing}
                className="h-11 flex-1 text-sm font-semibold"
              >
                Chọn file khác
              </Button>
              <Button
                size="lg"
                onClick={handleImport}
                disabled={importing || validRows.length === 0}
                className="h-11 flex-1 text-sm font-semibold"
              >
                {importing ? <Spinner /> : null}
                Nhập {validRows.length} món
              </Button>
            </div>
          </>
        )}
      </div>
    </ResponsiveSheet>
  );
}
