"use client";

import { useState } from "react";
import { X } from "lucide-react";

/** Nhập nguyên liệu dạng chip: Enter / dấu phẩy để tách, Backspace xóa chip cuối. */
export function TagInput({
  name,
  value,
  onChange,
  placeholder,
}: {
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
      .filter(Boolean)
      .filter((s) => !value.some((v) => v.toLowerCase() === s.toLowerCase()));
    if (parts.length > 0) onChange([...value, ...parts]);
    setDraft("");
  };

  return (
    <div className="flex min-h-11 flex-wrap items-center gap-1.5 rounded-xl border border-input bg-transparent px-2.5 py-2 transition-[color,box-shadow] focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/40">
      {value.map((tag) => (
        <span
          key={tag}
          className="inline-flex items-center gap-1 rounded-full bg-secondary py-0.5 pl-2.5 pr-1 text-xs font-medium text-secondary-foreground"
        >
          {tag}
          <button
            type="button"
            aria-label={`Xóa ${tag}`}
            onClick={() => onChange(value.filter((v) => v !== tag))}
            className="grid size-4 place-items-center rounded-full transition-colors hover:bg-foreground/10"
          >
            <X className="size-3" />
          </button>
          <input type="hidden" name={name} value={tag} />
        </span>
      ))}
      <input
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
          const adds = parts
            .map((s) => s.trim())
            .filter(Boolean)
            .filter(
              (s) => !value.some((t) => t.toLowerCase() === s.toLowerCase())
            );
          if (adds.length > 0) onChange([...value, ...adds]);
          setDraft(rest);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            commit();
          } else if (e.key === "Backspace" && draft === "" && value.length > 0) {
            onChange(value.slice(0, -1));
          }
        }}
        onBlur={commit}
        placeholder={value.length === 0 ? placeholder : ""}
        className="min-w-28 flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground"
      />
    </div>
  );
}
