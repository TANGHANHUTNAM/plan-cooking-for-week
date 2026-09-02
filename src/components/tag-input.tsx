"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { appendUniqueTags } from "@/lib/tag-input";
import { Badge } from "@/components/ui/badge";

/** Nhập nguyên liệu dạng chip: Enter hoặc dấu phẩy để tách, Backspace xóa chip cuối. */
export function TagInput({
  id,
  name,
  value,
  onChange,
  placeholder,
}: {
  id?: string;
  name: string;
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
}) {
  const [draft, setDraft] = useState("");

  const commit = () => {
    const parts = draft
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const additions = appendUniqueTags(value, parts);
    if (additions.length > 0) onChange([...value, ...additions]);
    setDraft("");
  };

  return (
    <div className="flex min-h-11 w-full flex-wrap items-center gap-1.5 rounded-md border border-input bg-input/20 px-2 py-1.5 transition-colors focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/30 dark:bg-input/30">
      {value.map((tag) => (
        <span key={tag} className="relative inline-flex h-6 shrink-0">
          <Badge variant="secondary" className="h-6 pr-5 pl-2.5">
            {tag}
          </Badge>
          <button
            type="button"
            aria-label={`Xóa nguyên liệu ${tag}`}
            onClick={() => onChange(value.filter((v) => v !== tag))}
            className="group/tag-remove absolute top-1/2 right-[-0.5rem] z-10 grid size-11 -translate-y-1/2 place-items-center rounded-full outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring lg:right-0 lg:size-6"
          >
            <span className="grid size-4 place-items-center rounded-full transition-colors group-hover/tag-remove:bg-foreground/10">
              <X className="size-3" />
            </span>
          </button>
          <input type="hidden" name={name} value={tag} />
        </span>
      ))}
      <input
        id={id}
        value={draft}
        onChange={(e) => {
          const v = e.target.value;
          if (!v.includes(",")) {
            setDraft(v);
            return;
          }
          // gõ/paste có dấu phẩy: tách thành chip ngay, giữ phần dang dở
          const parts = v.split(",");
          const rest = parts.pop() ?? "";
          const adds = appendUniqueTags(
            value,
            parts.map((s) => s.trim()).filter(Boolean)
          );
          if (adds.length > 0) onChange([...value, ...adds]);
          setDraft(rest);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            commit();
          } else if (
            e.key === "Backspace" &&
            draft === "" &&
            value.length > 0
          ) {
            onChange(value.slice(0, -1));
          }
        }}
        onBlur={commit}
        placeholder={value.length === 0 ? placeholder : ""}
        className="min-w-28 flex-1 bg-transparent px-1 text-base outline-none placeholder:text-muted-foreground md:text-sm"
      />
    </div>
  );
}
