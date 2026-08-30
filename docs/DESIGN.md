# Kế hoạch thiết kế — Cơm Nhà (tên dự án: PlanFoodInWeek)

> Nguồn yêu cầu: [docs/spec.md](./spec.md) (copy từ `smart-weekly-meal-planner-spec.md`).
> Spec là gốc về **tính năng**; tài liệu này là gốc về **cách triển khai**. Cập nhật tài liệu này khi đổi quyết định kỹ thuật.

## 1. Quyết định chính

| Hạng mục | Quyết định | Lý do |
|---|---|---|
| Framework | Next.js 15 (App Router, RSC + Server Actions), TypeScript | Theo spec §11; không cần REST API riêng |
| UI | Tailwind CSS v4 + shadcn/ui + lucide-react + sonner (toast) | Theo spec §11; Drawer (vaul) làm bottom sheet theo spec §7, §12 |
| ORM / DB | Prisma + PostgreSQL — **env do bạn cung cấp** | Theo spec §11 |
| Auth | Tự viết, gọn: `bcryptjs` (hash mật khẩu) + JWT ký bằng `jose` trong cookie `httpOnly`, hạn **90 ngày** | Chỉ có 1 tài khoản admin → NextAuth là thừa; "lưu đăng nhập" = cookie dài hạn, tự gia hạn |
| Người dùng | **Duy nhất 1 admin**, seed sẵn: `thucdon@gmail.com` / `admin123123!` | Yêu cầu chốt; không có trang đăng ký, không quên mật khẩu |
| Ngôn ngữ & UX | UI tiếng Việt, mobile-first (khung `max-w-md` giữa màn hình trên desktop), tuần bắt đầu **Thứ 2**, múi giờ **Asia/Ho_Chi_Minh** | Spec §12; dùng chủ yếu trên điện thoại |
| Font | Be Vietnam Pro qua `next/font/google` | Dấu tiếng Việt hiển thị chuẩn |
| Validation | zod (dùng chung schema cho form + server action) | Ít lặp code |

### Khác biệt so với spec (có chủ đích)

1. `users` thêm cột `password_hash` — spec không có nhưng bắt buộc để đăng nhập.
2. Bỏ cột `food_statistics.weekly_count` — tần suất theo tuần **tính động** từ bảng `meals`/`meal_items` (chính xác hơn, không cần job reset mỗi tuần).
3. "Đã nấu" gắn ở **bữa** (`Meal.cookedAt`), không gắn từng món — 1 nút bấm cập nhật thống kê cho cả món chính + món phụ, đúng mô tả spec §6 ("sau khi hoàn thành bữa ăn").
4. `favorite` = thang điểm 0–5 sao trên `Food.favoriteScore` (0 = chưa yêu thích) — gộp "đánh dấu yêu thích" và "favorite score" của spec làm một.

## 2. Cấu trúc thư mục

```
PlanFoodInWeek/
├─ prisma/
│  ├─ schema.prisma
│  └─ seed.ts                 # admin + ~18 món mẫu
├─ src/
│  ├─ middleware.ts           # chặn mọi route trừ /login, verify JWT (edge-safe)
│  ├─ app/
│  │  ├─ layout.tsx           # font, Toaster, metadata, viewport
│  │  ├─ globals.css
│  │  ├─ login/page.tsx
│  │  └─ (app)/               # nhóm route cần đăng nhập
│  │     ├─ layout.tsx        # app shell + BottomNav
│  │     ├─ page.tsx          # Tab 1: Hôm nay
│  │     ├─ week/page.tsx     # Tab 2: Lịch tuần
│  │     ├─ foods/page.tsx    # Tab 3: Món ăn
│  │     ├─ shopping/page.tsx # Tab 4: Đi chợ
│  │     └─ settings/page.tsx # Tab 5: Cài đặt
│  ├─ components/
│  │  ├─ ui/                  # shadcn
│  │  ├─ bottom-nav.tsx
│  │  ├─ meal-calendar/       # WeekView, DayCard, MealCard
│  │  ├─ food-management/     # FoodList, FoodFormSheet, FavoriteStars
│  │  ├─ random-picker/       # SwapSheet (Gợi ý / Random lại / Chọn từ danh sách)
│  │  └─ shopping-list/
│  ├─ actions/                # server actions: auth.ts, foods.ts, plans.ts
│  └─ lib/
│     ├─ prisma.ts            # PrismaClient singleton
│     ├─ session.ts           # sign/verify/refresh JWT cookie
│     ├─ random-engine.ts     # chấm điểm + chọn món
│     ├─ week.ts              # getWeekStart, ngày VN, format thứ/ngày
│     └─ validations.ts       # zod schemas
├─ docs/                      # spec.md + DESIGN.md (file này)
└─ .env                       # bạn cung cấp (xem §9)
```

## 3. Database — Prisma schema

```prisma
enum FoodType   { MAIN  SIDE }    // dùng chung cho Food.type và MealItem.position
enum MealPeriod { LUNCH DINNER }

model User {
  id           String     @id @default(cuid())
  email        String     @unique
  name         String
  passwordHash String
  createdAt    DateTime   @default(now())
  mealPlans    MealPlan[]
}

model Food {
  id            String         @id @default(cuid())
  name          String
  type          FoodType
  cookingMethod String                        // "Kho" | "Chiên" | "Xào" | ... (string, không enum — cho phép thêm tự do)
  note          String?
  favoriteScore Int            @default(0)    // 0..5 sao
  createdAt     DateTime       @default(now())
  updatedAt     DateTime       @updatedAt
  ingredients   Ingredient[]
  mealItems     MealItem[]
  statistic     FoodStatistic?
}

model Ingredient {
  id     String @id @default(cuid())
  foodId String
  name   String
  food   Food   @relation(fields: [foodId], references: [id], onDelete: Cascade)
}

model MealPlan {
  id        String   @id @default(cuid())
  userId    String
  weekStart DateTime @db.Date              // luôn là Thứ 2
  createdAt DateTime @default(now())
  user      User     @relation(fields: [userId], references: [id])
  meals     Meal[]
  @@unique([userId, weekStart])
}

model Meal {
  id         String     @id @default(cuid())
  mealPlanId String
  date       DateTime   @db.Date
  period     MealPeriod
  cookedAt   DateTime?                     // != null nghĩa là "Đã nấu"
  mealPlan   MealPlan   @relation(fields: [mealPlanId], references: [id], onDelete: Cascade)
  items      MealItem[]
  @@unique([mealPlanId, date, period])
}

model MealItem {
  id       String   @id @default(cuid())
  mealId   String
  foodId   String
  position FoodType                        // MAIN | SIDE
  meal     Meal     @relation(fields: [mealId], references: [id], onDelete: Cascade)
  food     Food     @relation(fields: [foodId], references: [id], onDelete: Cascade)
  @@unique([mealId, position])             // mỗi bữa đúng 1 món chính + 1 món phụ
}

model FoodStatistic {
  id           String    @id @default(cuid())
  foodId       String    @unique
  totalCooked  Int       @default(0)
  lastCookedAt DateTime?
  food         Food      @relation(fields: [foodId], references: [id], onDelete: Cascade)
}
```

Ghi chú:

- Xóa `Food` → cascade gỡ luôn khỏi lịch (`MealItem`). UI phải confirm: *"Món đang nằm trong lịch tuần, xóa sẽ gỡ khỏi lịch"*.
- `date` dùng `@db.Date` (không giờ) — mọi phép tính "hôm nay/tuần này" quy về múi giờ `Asia/Ho_Chi_Minh` tại server (serverless chạy UTC, không dùng `new Date()` trần).
- Phương pháp chế biến gợi ý sẵn trong UI: Kho, Chiên, Xào, Nướng, Luộc, Hấp, Canh, Trộn, Khác.

## 4. Auth & phiên đăng nhập

- `/login`: form email + mật khẩu. Đăng nhập thành công → set cookie `pf_session` (JWT HS256 ký bằng `AUTH_SECRET`, `httpOnly`, `sameSite=lax`, `secure` ở production, **maxAge 90 ngày** — đây là phần "lưu đăng nhập").
- `middleware.ts` (matcher loại trừ `_next`, static, `/login`): verify JWT bằng `jose` (chạy được trên edge). Không hợp lệ → redirect `/login`. Đã đăng nhập mà vào `/login` → redirect `/`. Token sống quá 30 ngày → tự ký lại (sliding renewal, đăng nhập gần như không bao giờ hết hạn nếu còn dùng app).
- Đăng nhập sai: chờ ~500ms + báo lỗi chung "Email hoặc mật khẩu không đúng" (chống dò mật khẩu ở mức đủ dùng cho app 1 người).
- `prisma/seed.ts`: `upsert` admin `thucdon@gmail.com`, tên "Admin", `passwordHash = bcrypt("admin123123!")`. Chạy lại seed không tạo trùng.
- Không có đăng ký / quên mật khẩu / phân quyền — cả app mặc định là admin sau khi qua middleware.

## 5. Random thực đơn thông minh (`lib/random-engine.ts`)

Điểm cho từng món ứng viên (theo công thức spec §5, chuẩn hóa về 0–1):

```
score = 2.0 × (favoriteScore / 5)                        // yêu thích
      + 1.5 × log(1 + totalCooked) / log(1 + maxCooked)  // hay ăn (log để món ăn 30 lần không áp đảo tuyệt đối)
      + 1.5 × min(daysSinceLastCooked, 30) / 30          // lâu chưa ăn (chưa nấu bao giờ = 1.0)
      + 1.0 × random()                                   // yếu tố ngẫu nhiên
```

Quy tắc chọn:

1. Món chính lấy từ pool `MAIN`, món phụ từ pool `SIDE`.
2. **Không lặp món trong tuần**: loại mọi món đã có mặt trong tuần đang xét.
3. Không chọn max điểm cứng — **weighted random trong top 5 điểm cao nhất** để mỗi lần random ra kết quả khác nhau nhưng vẫn "thông minh".
4. Pool cạn (ví dụ < 14 món chính khi random cả tuần): nới lỏng — cho phép lặp nhưng cách nhau ≥ 2 ngày và ưu tiên món lặp ít nhất.
5. Giới hạn số lần xuất hiện/tuần: mặc định 1 (hard-code phase đầu, đưa vào Cài đặt ở phase sau).

Dữ liệu vào: `Food` + `FoodStatistic` + danh sách món đã dùng trong tuần. Hàm thuần (pure), không gọi DB → test được bằng unit test.

## 6. Màn hình (6 màn: login + 5 tab bottom nav)

| Màn | Nội dung chính | Hành động |
|---|---|---|
| **Đăng nhập** `/login` | Logo + form email/mật khẩu | Đăng nhập (lưu 90 ngày) |
| **Hôm nay** `/` | 2 card **Trưa / Tối** của ngày hiện tại: món chính + món phụ + nguyên liệu cần chuẩn bị | Nút lớn **"Đã nấu"** (đổi trạng thái, cập nhật thống kê, có hoàn tác), **"Đổi món"** mở SwapSheet; chưa có lịch tuần → CTA "Tạo thực đơn tuần này" |
| **Lịch tuần** `/week` | Chuyển tuần ‹ › ; 7 card ngày (T2→CN), mỗi ngày 2 bữa, mỗi bữa 2 món; badge ✓ bữa đã nấu | **Random tuần** (confirm nếu ghi đè), **Copy tuần trước** (spec §8), chạm vào món → SwapSheet |
| **Món ăn** `/foods` | Tìm kiếm + filter chip (Tất cả / Món chính / Món phụ), list món: tên, cách chế biến, sao yêu thích, số lần đã nấu | Nút **+** thêm món; chạm để sửa/xóa. Form (bottom sheet): tên, loại, cách chế biến, nguyên liệu (nhập dạng tag), ghi chú, sao 0–5 |
| **Đi chợ** `/shopping` | Xem theo **ngày** (mặc định "Hôm nay" — đi chợ cả tuần một lần rất ngợp) hoặc cả tuần, qua dãy chip Cả tuần/T2→CN; gộp trùng tên, ghi rõ dùng cho món nào | Checkbox đánh dấu đã mua (lưu `localStorage` theo tuần, chung giữa các chế độ xem — spec §9 nói rõ không quản lý tồn kho) |
| **Cài đặt** `/settings` | Thông tin tài khoản, phiên bản | **Đăng xuất**; (phase sau: giới hạn lặp món/tuần, đổi mật khẩu) |

**SwapSheet** (bottom sheet đổi món — spec §7): 3 lựa chọn — *Gợi ý phù hợp* (top 5 theo điểm §5), *Random lại*, *Chọn từ danh sách* (search toàn bộ pool đúng loại).

Nguyên tắc UX (spec §12): thao tác 1 tay, button lớn (min-height 44px), bottom sheet thay modal, không dashboard.

## 7. Server Actions (`src/actions/`)

| Action | Input | Hành vi |
|---|---|---|
| `login` | email, password | Verify bcrypt → set cookie 90 ngày → redirect `/` |
| `logout` | — | Xóa cookie → `/login` |
| `createFood` / `updateFood` | zod `FoodInput` (kèm ingredients[]) | Ghi Food + thay danh sách Ingredient (transaction) |
| `deleteFood` | id | Xóa (cascade khỏi lịch), UI confirm trước |
| `setFavorite` | id, score 0–5 | Cập nhật sao |
| `generateWeek` | weekStart | Tạo/ghi đè 7 ngày × 2 bữa × (chính+phụ) bằng random engine |
| `copyLastWeek` | weekStart | Copy meal items tuần trước sang, reset `cookedAt` |
| `swapItem` | mealItemId, `{mode: "random" \| "manual", foodId?}` | Đổi 1 món (random loại trừ món đang có trong tuần) |
| `markCooked` / `undoCooked` | mealId | Transaction: set/clear `cookedAt`, tăng/giảm `FoodStatistic` của cả 2 món |

Đọc dữ liệu (tuần, danh sách món, gợi ý, shopping list) đi thẳng qua RSC + Prisma, không cần action. Sau mỗi mutation gọi `revalidatePath`.

## 8. Thứ tự triển khai

| Phase | Việc | Nghiệm thu |
|---|---|---|
| **0. Nền móng** | Scaffold Next 15 + TS + Tailwind v4 + shadcn; Prisma schema + migrate; seed admin + 18 món mẫu; auth (login/middleware/logout); app shell + bottom nav 5 tab | Đăng nhập bằng `thucdon@gmail.com` thành công, F5/tắt trình duyệt vẫn giữ phiên, route nào cũng bị chặn khi chưa đăng nhập |
| **1. Món ăn** | CRUD món + nguyên liệu + sao yêu thích + tìm kiếm/filter | Thêm–sửa–xóa món mượt trên mobile viewport |
| **2. Lịch tuần + Random** | random-engine (kèm unit test), Random tuần, SwapSheet đổi món, Đã nấu/hoàn tác | Random cả tuần không lặp món; Đã nấu làm tăng `totalCooked` và ảnh hưởng lần random sau |
| **3. Hôm nay + tiện ích** | Tab Hôm nay, Copy tuần trước, Đi chợ (gom nguyên liệu + checkbox) | Mở app thấy ngay hôm nay ăn gì, cần mua gì |
| **4. Hoàn thiện** | Empty/loading state, confirm dialog, PWA manifest + icon (thêm vào màn hình chính), smoke test Playwright toàn luồng | Chạy trọn luồng: login → thêm món → random tuần → đổi món → đã nấu → đi chợ |

Ngoài phạm vi đợt này (spec §13 Phase 2–3): notification, preference gia đình, AI assistant.

Mỗi phase kết thúc bằng chạy thử trên dev server (viewport mobile 390×844) trước khi sang phase kế.

## 9. Env cần bạn cung cấp

```env
# .env
DATABASE_URL="postgresql://user:password@host:5432/planfood"  # bắt buộc
AUTH_SECRET="chuỗi ngẫu nhiên >= 32 ký tự"                     # tôi tự generate được nếu bạn muốn
```

- **Neon / Postgres local**: chỉ cần `DATABASE_URL`.
- **Supabase**: thêm `DIRECT_URL` (cổng 5432) cho migrate, `DATABASE_URL` trỏ pooler 6543 — schema sẽ khai báo thêm `directUrl`.
- Chạy local trước; deploy (Vercel + Neon/Supabase) tính sau khi app chạy ổn.

## 10. Trạng thái triển khai — 30/08/2026: HOÀN THÀNH ✅

Toàn bộ Phase 0–4 đã build, test và verify trên trình duyệt (viewport 390×844). Khác biệt so với kế hoạch do "dùng bản mới nhất":

| Kế hoạch | Thực tế | Ghi chú |
|---|---|---|
| Next.js 15 | **Next.js 16.3.3** | `middleware.ts` đổi tên thành `src/proxy.ts` (export `proxy`), searchParams là Promise |
| Prisma (v6) | **Prisma 7.10** | URL nằm ở `prisma.config.ts` (CLI dùng `DIRECT_URL`); generator `prisma-client` xuất ra `src/generated/prisma`; runtime bắt buộc driver adapter `@prisma/adapter-pg`; seed chạy `npx tsx` |
| shadcn init `-b neutral` | shadcn v5: `init -y -b radix -p mira` | flags đổi nghĩa; theme tự viết lại trong `globals.css` (palette xanh rau + dark theo `prefers-color-scheme`) |
| — | Transaction gom 4 query (`createManyAndReturn`) | 14 lượt `create` tuần tự vượt timeout 5s với Supabase ở xa |
| — | Engine: khi pool < 14 slot, nới lỏng nhưng cấm lặp cùng ngày + phân bố đều số lần lặp | Bắt được khi verify trên UI, đã thêm unit test |

Verify đã chạy: 20 unit test pass · `tsc --noEmit` sạch · `eslint` sạch · `next build` production thành công · luồng login → random tuần → đổi món (3 kiểu) → đã nấu/hoàn tác → thêm món → đi chợ → đăng xuất chạy tốt trên Supabase thật.

Chưa làm (để sau): PNG icon cho PWA install prompt trên một số thiết bị (đang dùng SVG), đổi mật khẩu, giới hạn lặp món/tuần trong Cài đặt, notification + AI assistant (spec Phase 2–3).

### Bổ sung 30/08/2026 (chiều) — responsive desktop/tablet + chỉnh theo phản hồi

- **Responsive đầy đủ**: `lg+` dùng sidebar trái (`side-nav.tsx`) thay bottom nav; Hôm nay 2 cột (`md`), Lịch tuần lưới ngày 2 cột (`md`) → 7 cột (`2xl`), Món ăn/Đi chợ lưới card 2–3 cột; bottom sheet (vaul) tự chuyển thành dialog giữa màn hình trên desktop qua `responsive-sheet.tsx` + hook `use-is-desktop.ts` (`useSyncExternalStore`, khớp breakpoint `lg`).
- **Đi chợ theo ngày** (yêu cầu người dùng): mặc định "Hôm nay", chip chuyển T2→CN/Cả tuần; gom nguyên liệu chuyển thành hàm thuần `lib/shopping.ts` chạy client, tick vẫn lưu theo tuần nên dùng chung giữa các chế độ xem.
- **Nhãn Món chính/Món phụ** (yêu cầu người dùng): mỗi món trong MealCard có nhãn uppercase nhỏ (chính = màu primary, phụ = muted) ở cả 2 biến thể; món phụ bỏ tiền tố "+", thêm badge cách chế biến ở biến thể full.

### Bổ sung 30/08/2026 (tối) — import Excel, xóa nhanh, dark mode

- **Import món từ Excel** (yêu cầu người dùng): nút "Nhập Excel" ở tab Món ăn. File mẫu `.xlsx` tải tại route `/foods/template` (sinh động bằng `exceljs`: 6 cột, dropdown Chính/Phụ, sheet Hướng dẫn, 2 dòng ví dụ). Luồng 2 bước: `parseImportExcel` (server action, đọc file → preview từng dòng: hợp lệ / trùng-bỏ-qua / lỗi kèm số dòng) → người dùng xác nhận → `importFoods` (validate lại bằng zod, bỏ trùng theo tên+loại, ghi 3 query gộp `createManyAndReturn` trong transaction). Tối đa 200 món/lần, chấp nhận "Chính/chinh/MAIN/Món chính"… (chuẩn hóa bỏ dấu trong `lib/import-foods.ts` — có unit test). `serverActions.bodySizeLimit` nâng lên 4MB.
- **Xóa nhanh trong danh sách món** (yêu cầu người dùng): icon thùng rác trên từng card (không phải bấm vào form), luôn qua AlertDialog confirm; hàng đổi cấu trúc div + 2 button để tránh button lồng button.
- **Light/Dark mode** (yêu cầu người dùng): next-themes quản lý class `.dark` (bỏ media-query cứng trong globals.css); bộ chọn Sáng/Tối/Hệ thống trong Cài đặt (`theme-toggle.tsx`, mounted-guard bằng `useSyncExternalStore`); mặc định theo hệ điều hành, lựa chọn lưu localStorage.
- Gotcha đã gặp: `AlertDialogAction` của shadcn v5 nhận prop `variant` (đè className không ăn vì Slot không tw-merge); `exceljs` là CJS (named import chỉ dùng được qua bundler); lỗi console dev "Router action dispatched before initialization" là noise HMR của Next dev, không phải bug app.

### Bổ sung 30/08/2026 (đêm) — nhiều thành viên + đánh dấu ai ăn/không ăn

**Thay đổi ràng buộc lớn theo yêu cầu người dùng**: app chuyển từ 1 admin sang **5 tài khoản gia đình** (thucdon/nam/khang/dat/bao @gmail.com, cùng mật khẩu `admin123123!`, seed idempotent trong `FAMILY_ACCOUNTS`).

- **Thực đơn là của chung cả nhà**: `meal_plans` đổi unique từ `(userId, weekStart)` sang `(weekStart)` — `userId` chỉ còn là người tạo; `getWeekPlan(weekStartISO)` không lọc theo user nữa. Món ăn/thống kê vốn đã là dữ liệu chung.
- **Đánh dấu theo TỪNG BỮA** (trưa/tối — chọn mức bữa thay vì mức ngày vì trường hợp phổ biến là "tối nay không ăn"): bảng mới `meal_absences` (unique mealId+userId, có dòng = KHÔNG ăn, mặc định ai cũng ăn, cascade khi xóa bữa/user). Action `toggleMealAbsence` — mọi thành viên đánh dấu được cho nhau (gia đình tin nhau, mẹ đánh hộ con).
- **UI**: card bữa (Hôm nay) có mục "Ai ăn bữa này · x/5" với chip từng người — bấm để bật/tắt, đổi ngay bằng `useOptimistic`, chip không ăn = gạch ngang + icon UserX; Lịch tuần hiện dòng "Nam, Đạt không ăn" khi có người vắng; Cài đặt liệt kê 5 thành viên (đánh dấu "(bạn)" cho người đang đăng nhập).
- **Migration không cần TTY**: Prisma 7 `migrate dev` từ chối shell non-interactive → dùng `migrate diff --from-config-datasource --to-schema --script -o` ghi SQL vào `prisma/migrations/<ts>_multi_user_attendance/` rồi `migrate deploy`.
- Gotcha: Prisma singleton cache trong `globalThis` sống qua HMR — sau khi `prisma generate` đổi schema phải **restart dev server**, không hot-reload được client mới.

### Bổ sung 30/08/2026 (khuya) — quản lý thành viên, đổi tên "Cơm Nhà", đi chợ theo thói quen nhà

- **Xóa tài khoản trong app** (trả lời "remove tài khoản admin"): Cài đặt → Thành viên gia đình có nút xóa từng người, confirm rõ hậu quả; chặn xóa tài khoản cuối cùng; **tự xóa chính mình thì bị đăng xuất ngay** (action `deleteMember`). Để làm được sạch sẽ: bỏ hẳn cột `meal_plans.userId` (migration `household_plan_no_owner`) — thực đơn không gắn người tạo nên xóa user không đụng lịch. **Người dùng đã tự xóa `thucdon@gmail.com`**; seed cũng gỡ tài khoản này khỏi `FAMILY_ACCOUNTS` để không hồi sinh (hệ còn 4 thành viên: Nam, Khang, Đạt, Bảo). Lưu ý JWT stateless: phiên đã đăng nhập ở máy khác của tài khoản bị xóa vẫn sống tới khi hết hạn/đăng xuất (chỉ không đăng nhập lại được).
- **Đổi tên app thành "Cơm Nhà"** (yêu cầu người dùng, tôi chọn tên): mọi chỗ hiển thị lấy từ `src/lib/app-info.ts` (APP_NAME/TAGLINE/DESCRIPTION/VERSION 0.2.0) — metadata, login, sidebar, manifest, footer Cài đặt, file mẫu Excel (`mau-mon-an-com-nha.xlsx`). Tên kỹ thuật (package/folder/artifact) giữ PlanFoodInWeek.
- **Món phụ là tùy chọn theo bữa** (yêu cầu người dùng): random tuần vẫn luôn chọn đủ món chính + món phụ, nhưng từng bữa bỏ được món phụ (sheet đổi món phụ có nút "Bữa này không ăn món phụ" — action `removeSideDish`, chỉ SIDE bỏ được, món chính bắt buộc) và thêm lại qua nút dashed "+ Thêm món phụ" trên card (sheet chế độ thêm: random thông minh / gợi ý / chọn tay — `addSideDish`, `suggestSideForMeal`; helper gợi ý dùng chung `topSuggestionDTOs`). Engine: `WeekAssignment.sideId` nullable — hết món phụ trong kho vẫn random được tuần chỉ món chính (33 unit test).
- **Đi chợ theo thói quen nhà** (yêu cầu người dùng): scope mới **"Tối nay + trưa mai"** làm mặc định khi xem tuần hiện tại — đúng nếp đi chợ buổi chiều; Chủ nhật thì "trưa mai" nằm tuần sau nên trang tải thêm plan tuần kế và gộp xuyên tuần, kèm note khi tuần sau chưa có thực đơn. Danh sách đổi cấu trúc **Buổi → Món → Nguyên liệu** (hết phẳng lộn xộn), desktop mỗi buổi 2 card món cạnh nhau; nút Copy xuất đúng cấu trúc đó (▸ Tối nay (30/08) / - Cá kho tộ: Cá basa, …). Tick vẫn theo tên nguyên liệu — mua một lần gạch mọi chỗ.

## 11. Seed món mẫu (xóa được trong app)

- **Món chính (10)**: Thịt kho trứng, Cá kho tộ, Gà kho gừng, Tôm rim mặn, Gà chiên nước mắm, Cá chiên giòn, Trứng chiên hành, Sườn xào chua ngọt, Bò lúc lắc, Ba rọi luộc.
- **Món phụ (8)**: Canh chua cá, Canh bí đỏ thịt bằm, Canh rau ngót, Canh khổ qua nhồi thịt, Rau muống xào tỏi, Cải thìa xào nấm, Đậu que xào, Rau lang luộc.

Mỗi món kèm nguyên liệu cơ bản + vài món set sẵn 4–5 sao để random "thông minh" thấy khác biệt ngay từ đầu.
