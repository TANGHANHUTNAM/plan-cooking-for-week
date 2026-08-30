# Cơm Nhà 🍲

Ứng dụng thực đơn tuần cho gia đình (tên dự án: PlanFoodInWeek) — *"Mở app nhanh, biết hôm nay ăn gì, ai ăn, cần chuẩn bị gì."*

- **Hôm nay** — 2 bữa trưa/tối của ngày, nguyên liệu cần chuẩn bị, nút **Đã nấu** (hệ thống học thói quen ăn uống từ đây).
- **Lịch tuần** — T2→CN, **Random tuần** thông minh (điểm = yêu thích + hay ăn + lâu chưa ăn + ngẫu nhiên, không lặp món trong tuần), **Copy tuần trước**, đổi từng món qua bottom sheet.
- **Món ăn** — CRUD món chính/món phụ, nguyên liệu, chấm 0–5 sao.
- **Đi chợ** — gom nguyên liệu cả tuần, gộp trùng, tick đã mua (lưu trên máy).
- **Cài đặt** — tài khoản, thống kê, đăng xuất.

Chi tiết thiết kế: [docs/DESIGN.md](./docs/DESIGN.md) · Spec gốc: [docs/spec.md](./docs/spec.md)

## Stack

Next.js 16 (App Router, Server Actions, proxy.ts) · React 19 · TypeScript · Tailwind CSS v4 + shadcn/ui · Prisma 7 (driver adapter `@prisma/adapter-pg`) · PostgreSQL trên Supabase · Auth tự viết (bcryptjs + JWT `jose`, cookie httpOnly 90 ngày tự gia hạn).

**4 tài khoản thành viên gia đình** (seed sẵn, cùng mật khẩu `admin123123!`): `nam@gmail.com`, `khang@gmail.com`, `dat@gmail.com`, `bao@gmail.com` — không có đăng ký/quên mật khẩu, không phân quyền (tài khoản admin cũ `thucdon@gmail.com` đã gỡ theo yêu cầu). Cả nhà xem chung **một thực đơn tuần**; trên mỗi bữa có chip thành viên để đánh dấu **ai không ăn** (bảng `meal_absences`, mặc định ai cũng ăn). Xóa tài khoản trong **Cài đặt → Thành viên gia đình** (chặn xóa tài khoản cuối cùng; tự xóa mình thì bị đăng xuất).

## Chạy dự án

```bash
npm install            # tự chạy prisma generate (postinstall)
npm run dev            # http://localhost:3000
```

`.env` cần 3 biến (xem `.env.example`): `DATABASE_URL` (Supabase pooler 6543), `DIRECT_URL` (cổng 5432 — dùng cho migrate/seed), `AUTH_SECRET` (chuỗi ngẫu nhiên ≥ 32 ký tự).

## Scripts

| Lệnh | Việc |
|---|---|
| `npm run dev` / `build` / `start` | Dev server / build production / chạy production |
| `npm test` | Unit test (vitest) cho random engine + xử lý tuần |
| `npm run db:migrate` | `prisma migrate dev` (đi qua `DIRECT_URL`) |
| `npm run db:seed` | Seed admin + 18 món mẫu (idempotent — chạy lại không tạo trùng) |
| `npm run db:studio` | Prisma Studio xem dữ liệu |

## Ghi chú kỹ thuật

- Mọi phép tính "hôm nay/tuần này" quy về múi giờ `Asia/Ho_Chi_Minh` (`src/lib/week.ts`) — server chạy UTC vẫn đúng ngày.
- Engine random là hàm thuần trong `src/lib/random-engine.ts`; khi pool ít món sẽ nới lỏng nhưng **không bao giờ lặp món trong cùng một ngày** và phân bố lần lặp đều.
- Prisma 7: URL cấu hình ở `prisma.config.ts` (CLI dùng `DIRECT_URL`), runtime dùng adapter pg với `DATABASE_URL`.
