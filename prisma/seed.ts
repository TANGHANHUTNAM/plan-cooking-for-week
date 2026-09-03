import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
if (!connectionString)
  throw new Error("Thiếu DIRECT_URL / DATABASE_URL trong .env");

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

const ADMIN_PASSWORD = "admin123123!";

/** Family members share one password and see one shared meal plan.
 *  (The admin account was removed as requested on 30/08.) */
const FAMILY_ACCOUNTS = [
  { email: "nam@gmail.com", name: "Nam" },
  { email: "khang@gmail.com", name: "Khang" },
  { email: "dat@gmail.com", name: "Đạt" },
  { email: "bao@gmail.com", name: "Bảo" },
];

type SeedFood = {
  name: string;
  type: "MAIN" | "SIDE";
  cookingMethod: string;
  ingredients: string[];
  favoriteScore: number;
  totalCooked: number;
  lastCookedDaysAgo: number | null;
  note?: string;
};

const FOODS: SeedFood[] = [
  // ---- Main dishes ----
  {
    name: "Thịt kho trứng",
    type: "MAIN",
    cookingMethod: "Kho",
    ingredients: ["Thịt ba rọi", "Trứng vịt", "Nước dừa", "Hành tím"],
    favoriteScore: 5,
    totalCooked: 24,
    lastCookedDaysAgo: 6,
    note: "Kho lửa nhỏ 45 phút",
  },
  {
    name: "Cá kho tộ",
    type: "MAIN",
    cookingMethod: "Kho",
    ingredients: ["Cá basa", "Nước màu", "Ớt", "Hành tím"],
    favoriteScore: 4,
    totalCooked: 18,
    lastCookedDaysAgo: 3,
  },
  {
    name: "Gà kho gừng",
    type: "MAIN",
    cookingMethod: "Kho",
    ingredients: ["Đùi gà", "Gừng", "Nước mắm"],
    favoriteScore: 3,
    totalCooked: 10,
    lastCookedDaysAgo: 12,
  },
  {
    name: "Tôm rim mặn ngọt",
    type: "MAIN",
    cookingMethod: "Kho",
    ingredients: ["Tôm đất", "Đường", "Nước mắm", "Tỏi"],
    favoriteScore: 4,
    totalCooked: 12,
    lastCookedDaysAgo: 9,
  },
  {
    name: "Gà chiên nước mắm",
    type: "MAIN",
    cookingMethod: "Chiên",
    ingredients: ["Cánh gà", "Nước mắm", "Tỏi", "Đường"],
    favoriteScore: 5,
    totalCooked: 20,
    lastCookedDaysAgo: 5,
  },
  {
    name: "Cá chiên giòn",
    type: "MAIN",
    cookingMethod: "Chiên",
    ingredients: ["Cá diêu hồng", "Bột chiên giòn", "Chanh"],
    favoriteScore: 2,
    totalCooked: 6,
    lastCookedDaysAgo: 15,
  },
  {
    name: "Trứng chiên hành",
    type: "MAIN",
    cookingMethod: "Chiên",
    ingredients: ["Trứng gà", "Hành lá"],
    favoriteScore: 3,
    totalCooked: 15,
    lastCookedDaysAgo: 2,
    note: "Món chữa cháy nhanh nhất",
  },
  {
    name: "Sườn xào chua ngọt",
    type: "MAIN",
    cookingMethod: "Xào",
    ingredients: ["Sườn non", "Cà chua", "Dứa", "Tỏi"],
    favoriteScore: 4,
    totalCooked: 9,
    lastCookedDaysAgo: 20,
  },
  {
    name: "Bò lúc lắc",
    type: "MAIN",
    cookingMethod: "Xào",
    ingredients: ["Thịt bò", "Ớt chuông", "Hành tây", "Xì dầu"],
    favoriteScore: 5,
    totalCooked: 7,
    lastCookedDaysAgo: 25,
  },
  {
    name: "Ba rọi luộc",
    type: "MAIN",
    cookingMethod: "Luộc",
    ingredients: ["Thịt ba rọi", "Nước mắm gừng", "Rau sống"],
    favoriteScore: 2,
    totalCooked: 8,
    lastCookedDaysAgo: 10,
  },
  // ---- Side dishes ----
  {
    name: "Canh chua cá",
    type: "SIDE",
    cookingMethod: "Canh",
    ingredients: ["Cá lóc", "Me chua", "Cà chua", "Đậu bắp", "Giá đỗ"],
    favoriteScore: 5,
    totalCooked: 16,
    lastCookedDaysAgo: 4,
  },
  {
    name: "Canh bí đỏ thịt bằm",
    type: "SIDE",
    cookingMethod: "Canh",
    ingredients: ["Bí đỏ", "Thịt bằm", "Hành lá"],
    favoriteScore: 3,
    totalCooked: 12,
    lastCookedDaysAgo: 8,
  },
  {
    name: "Canh rau ngót thịt bằm",
    type: "SIDE",
    cookingMethod: "Canh",
    ingredients: ["Rau ngót", "Thịt bằm"],
    favoriteScore: 3,
    totalCooked: 10,
    lastCookedDaysAgo: 6,
  },
  {
    name: "Canh khổ qua nhồi thịt",
    type: "SIDE",
    cookingMethod: "Canh",
    ingredients: ["Khổ qua", "Thịt bằm", "Nấm mèo"],
    favoriteScore: 2,
    totalCooked: 5,
    lastCookedDaysAgo: 18,
  },
  {
    name: "Rau muống xào tỏi",
    type: "SIDE",
    cookingMethod: "Xào",
    ingredients: ["Rau muống", "Tỏi"],
    favoriteScore: 4,
    totalCooked: 22,
    lastCookedDaysAgo: 2,
  },
  {
    name: "Cải thìa xào nấm",
    type: "SIDE",
    cookingMethod: "Xào",
    ingredients: ["Cải thìa", "Nấm đông cô", "Dầu hào"],
    favoriteScore: 3,
    totalCooked: 8,
    lastCookedDaysAgo: 11,
  },
  {
    name: "Đậu que xào tỏi",
    type: "SIDE",
    cookingMethod: "Xào",
    ingredients: ["Đậu que", "Tỏi"],
    favoriteScore: 2,
    totalCooked: 6,
    lastCookedDaysAgo: 14,
  },
  {
    name: "Rau lang luộc",
    type: "SIDE",
    cookingMethod: "Luộc",
    ingredients: ["Rau lang", "Nước mắm"],
    favoriteScore: 1,
    totalCooked: 4,
    lastCookedDaysAgo: 22,
  },
];

const DAY_MS = 24 * 60 * 60 * 1000;

async function main() {
  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);
  for (const account of FAMILY_ACCOUNTS) {
    const user = await prisma.user.upsert({
      where: { email: account.email },
      update: {}, // do not overwrite the password/name if it has already changed
      create: { email: account.email, name: account.name, passwordHash },
    });
    console.log(`✔ Thành viên: ${user.name} <${user.email}>`);
  }

  const foodCount = await prisma.food.count();
  if (foodCount > 0) {
    console.log(`✔ Đã có ${foodCount} món — bỏ qua seed món mẫu`);
    return;
  }

  for (const f of FOODS) {
    await prisma.food.create({
      data: {
        name: f.name,
        type: f.type,
        cookingMethod: f.cookingMethod,
        note: f.note,
        favoriteScore: f.favoriteScore,
        ingredients: { create: f.ingredients.map((name) => ({ name })) },
        statistic: {
          create: {
            totalCooked: f.totalCooked,
            lastCookedAt:
              f.lastCookedDaysAgo === null
                ? null
                : new Date(Date.now() - f.lastCookedDaysAgo * DAY_MS),
          },
        },
      },
    });
  }
  console.log(`✔ Seed ${FOODS.length} món mẫu kèm nguyên liệu + thống kê`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
