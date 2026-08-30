import { z } from "zod";

export const COOKING_METHODS = [
  "Kho",
  "Chiên",
  "Xào",
  "Nướng",
  "Luộc",
  "Hấp",
  "Canh",
  "Trộn",
  "Khác",
] as const;

export const loginSchema = z.object({
  email: z.email("Email không hợp lệ"),
  password: z.string().min(1, "Nhập mật khẩu"),
});

export const foodSchema = z.object({
  name: z.string().trim().min(1, "Nhập tên món").max(100, "Tên món quá dài"),
  type: z.enum(["MAIN", "SIDE"]),
  cookingMethod: z
    .string()
    .trim()
    .min(1, "Chọn cách chế biến")
    .max(50, "Cách chế biến quá dài"),
  note: z.string().trim().max(500, "Ghi chú quá dài").optional().or(z.literal("")),
  favoriteScore: z.coerce.number().int().min(0).max(5),
  ingredients: z
    .array(z.string().trim().min(1).max(60))
    .max(30, "Tối đa 30 nguyên liệu"),
});

export type FoodInput = z.infer<typeof foodSchema>;
