# Smart Weekly Meal Planner - Product Specification

## 1. Tổng quan

## Mục tiêu sản phẩm

Smart Weekly Meal Planner là ứng dụng quản lý thực đơn gia đình theo
tuần.

Mục tiêu:

-   Giúp người dùng lên kế hoạch món ăn từ thứ 2 đến chủ nhật.
-   Mỗi ngày gồm 2 bữa: trưa và tối.
-   Mỗi bữa gồm:
    -   1 món chính (mặn, kho, chiên, xào, nướng...)
    -   1 món phụ (canh, rau, món xào...)
-   Random thực đơn dựa trên danh sách món người dùng tạo.
-   Học thói quen ăn uống để ưu tiên các món thường xuyên sử dụng.

Ứng dụng tập trung vào việc: \> "Mở app nhanh, biết hôm nay ăn gì, cần
chuẩn bị gì."

Không quản lý công thức nấu ăn hoặc video hướng dẫn.

------------------------------------------------------------------------

# 2. Phạm vi MVP

## Chức năng chính

### 1. Quản lý món ăn

Người dùng có thể:

-   Thêm món ăn.
-   Sửa món ăn.
-   Xóa món ăn.
-   Đánh dấu yêu thích.
-   Ghi chú nguyên liệu cần chuẩn bị.

Thông tin món:

-   Tên món.
-   Loại món.
-   Phương pháp chế biến.
-   Nhóm món.
-   Danh sách nguyên liệu.
-   Ghi chú.

Ví dụ:

Thịt kho trứng

Loại: - Món chính

Cách làm: - Kho

Nguyên liệu: - Thịt heo - Trứng - Nước dừa

------------------------------------------------------------------------

# 3. Phân loại món ăn

## Nhóm món chính

MAIN

Ví dụ:

-   Kho
-   Chiên
-   Xào
-   Nướng
-   Luộc

## Nhóm món phụ

SIDE

Ví dụ:

-   Canh
-   Rau xào
-   Rau luộc

------------------------------------------------------------------------

# 4. Weekly Meal Planner

## Cấu trúc

Một tuần:

Thứ 2 -\> Chủ nhật

Mỗi ngày:

-   Lunch
-   Dinner

Mỗi bữa:

-   Main dish
-   Side dish

Ví dụ:

Thứ 2:

Trưa: - Cá kho - Canh chua

Tối: - Gà chiên - Rau xào

------------------------------------------------------------------------

# 5. Random thực đơn thông minh

## Không random thuần

Hệ thống sử dụng điểm ưu tiên.

Công thức:

Score =

Favorite Score + Frequency Score + Last Cooked Score + Random Weight

## Quy tắc

-   Không lặp cùng món trong tuần.
-   Ưu tiên món người dùng thường ăn.
-   Ưu tiên món lâu chưa xuất hiện.
-   Cho phép giới hạn số lần xuất hiện.

Ví dụ:

Thịt kho:

-   Đã ăn 30 lần.
-   Yêu thích 5 sao.
-   10 ngày chưa ăn.

=\> Điểm cao.

------------------------------------------------------------------------

# 6. Quản lý lịch sử món ăn

Sau khi hoàn thành bữa ăn:

Người dùng bấm:

"Đã nấu"

Hệ thống cập nhật:

-   Số lần món được sử dụng.
-   Lần cuối sử dụng.
-   Tần suất theo tuần.

Dữ liệu này phục vụ random thông minh.

------------------------------------------------------------------------

# 7. Đổi món nhanh

Trong lịch tuần:

Người dùng có thể:

-   Đổi random món hiện tại.
-   Chọn món thủ công.
-   Thay món chính.
-   Thay món phụ.

UX:

Bottom sheet mobile:

Đổi món:

-   Gợi ý phù hợp.
-   Random lại.
-   Chọn từ danh sách.

------------------------------------------------------------------------

# 8. Copy tuần trước

Tính năng giúp giảm thao tác.

Flow:

Tuần mới:

Copy tuần trước

Sau đó chỉnh sửa một vài món.

------------------------------------------------------------------------

# 9. Shopping Note (Optional)

Không quản lý tồn kho.

Chỉ hỗ trợ:

Gom nguyên liệu từ thực đơn.

Ví dụ:

Tuần này cần:

-   Thịt heo
-   Cá
-   Rau cải
-   Trứng

------------------------------------------------------------------------

# 10. Database Design

## users

Fields:

-   id
-   name
-   email
-   created_at

## foods

Lưu món ăn.

Fields:

-   id
-   name
-   type
-   cooking_method
-   note
-   favorite_score
-   created_at

type:

-   MAIN
-   SIDE

## ingredients

Nguyên liệu.

Fields:

-   id
-   food_id
-   name

## meal_plans

Một kế hoạch tuần.

Fields:

-   id
-   user_id
-   week_start
-   created_at

## meals

Một bữa ăn.

Fields:

-   id
-   meal_plan_id
-   date
-   period

period:

-   LUNCH
-   DINNER

## meal_items

Món trong bữa.

Fields:

-   id
-   meal_id
-   food_id
-   position

position:

-   MAIN
-   SIDE

## food_statistics

Thống kê món.

Fields:

-   id
-   food_id
-   total_cooked
-   last_cooked_at
-   weekly_count

------------------------------------------------------------------------

# 11. Frontend Architecture

Tech stack:

-   Next.js 15
-   TypeScript
-   Tailwind CSS
-   Shadcn UI
-   Prisma
-   PostgreSQL

## UI Structure

/app

/components

-   meal-calendar
-   food-management
-   random-picker
-   shopping-list

------------------------------------------------------------------------

# 12. Mobile First UX

## Bottom Navigation

5 tab:

1.  Hôm nay
2.  Lịch tuần
3.  Món ăn
4.  Đi chợ
5.  Cài đặt

## Nguyên tắc UX

-   Một tay thao tác.
-   Ít nhập liệu.
-   Button lớn.
-   Bottom sheet thay modal.
-   Không tạo dashboard phức tạp.

------------------------------------------------------------------------

# 13. Roadmap phát triển

## Phase 1

MVP:

-   CRUD món.
-   Lịch tuần.
-   Random món.
-   Đổi món.
-   Favorite.
-   Lịch sử sử dụng.

## Phase 2

-   Shopping note.
-   Preference gia đình.
-   Copy tuần.
-   Notification.

## Phase 3

AI Meal Assistant:

Ví dụ:

"Nhà còn thịt gà và rau cải"

AI đề xuất:

-   Gà xào cải xanh.
-   Canh gà.

------------------------------------------------------------------------

# 14. Nguyên tắc phát triển

Ưu tiên:

-   Đơn giản.
-   Nhanh.
-   Mobile first.
-   Ít thao tác.
-   Dữ liệu càng dùng càng thông minh.

Không xây dựng:

-   Công thức nấu ăn.
-   Video.
-   Mạng xã hội.
-   Marketplace.
