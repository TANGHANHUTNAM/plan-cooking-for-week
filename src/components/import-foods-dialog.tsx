"use client";

import { useRef, useState, useTransition } from "react";
import { Download, FileUp, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { importFoods, parseImportExcel } from "@/actions/import";
import type { PreviewRow } from "@/lib/import-foods";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ResponsiveSheet } from "@/components/responsive-sheet";

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
      description="Điền món vào file mẫu rồi tải lên — xem trước trước khi nhập."
    >
      <div className="flex flex-col gap-4">
        {rows === null ? (
          <>
            <ol className="list-decimal space-y-1.5 pl-5 text-sm text-muted-foreground">
              <li>
                Tải file mẫu về và điền món vào sheet{" "}
                <span className="font-medium text-foreground">“Món ăn”</span>{" "}
                (mỗi dòng một món).
              </li>
              <li>
                Nguyên liệu viết chung một ô, cách nhau bằng{" "}
                <span className="font-medium text-foreground">dấu phẩy</span>.
              </li>
              <li>Chọn file để xem trước — món trùng sẽ tự bỏ qua.</li>
            </ol>

            <div className="flex flex-col gap-2">
              <Button asChild variant="outline" className="h-11 font-semibold">
                <a href="/foods/template" download>
                  <Download className="size-4" />
                  Tải file mẫu (.xlsx)
                </a>
              </Button>

              <Button asChild disabled={parsing} className="h-11 font-semibold">
                <label className="cursor-pointer">
                  {parsing ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <FileUp className="size-4" />
                  )}
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
            <div className="flex flex-wrap gap-1.5 text-xs font-semibold">
              <span className="rounded-full bg-secondary px-2.5 py-1 text-secondary-foreground">
                {validRows.length} món sẽ nhập
              </span>
              {duplicateCount > 0 ? (
                <span className="rounded-full bg-muted px-2.5 py-1 text-muted-foreground">
                  {duplicateCount} trùng — bỏ qua
                </span>
              ) : null}
              {errorCount > 0 ? (
                <span className="rounded-full bg-destructive/10 px-2.5 py-1 text-destructive">
                  {errorCount} dòng lỗi
                </span>
              ) : null}
            </div>

            <div className="max-h-64 divide-y divide-border overflow-y-auto rounded-xl border border-border">
              {rows.map((row) => (
                <div
                  key={row.rowNumber}
                  className={cn(
                    "px-3.5 py-2.5",
                    row.status === "duplicate" && "opacity-60"
                  )}
                >
                  {row.status === "error" ? (
                    <p className="text-sm font-medium text-destructive">
                      Dòng {row.rowNumber}
                      {row.name ? ` — ${row.name}` : ""}: {row.message}
                    </p>
                  ) : (
                    <>
                      <p className="text-[15px] font-medium">
                        {row.data.name}
                        {row.status === "duplicate" ? (
                          <span className="ml-2 text-xs font-normal text-muted-foreground">
                            đã có — bỏ qua
                          </span>
                        ) : null}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {row.data.type === "MAIN" ? "Món chính" : "Món phụ"} ·{" "}
                        {row.data.cookingMethod}
                        {row.data.ingredients.length > 0
                          ? ` · ${row.data.ingredients.length} nguyên liệu`
                          : ""}
                        {row.data.favoriteScore > 0
                          ? ` · ★ ${row.data.favoriteScore}`
                          : ""}
                      </p>
                    </>
                  )}
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={reset}
                disabled={importing}
                className="h-11 flex-1 font-semibold"
              >
                Chọn file khác
              </Button>
              <Button
                onClick={handleImport}
                disabled={importing || validRows.length === 0}
                className="h-11 flex-1 font-semibold"
              >
                {importing ? <Loader2 className="size-4 animate-spin" /> : null}
                Nhập {validRows.length} món
              </Button>
            </div>
          </>
        )}
      </div>
    </ResponsiveSheet>
  );
}
