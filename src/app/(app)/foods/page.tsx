import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { getAllFoods } from "@/lib/queries";
import { mapFood } from "@/lib/dto";
import { FoodsScreen } from "@/components/foods-screen";

export const metadata: Metadata = { title: "Món ăn" };

export default async function FoodsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const foods = await getAllFoods();
  return <FoodsScreen foods={foods.map(mapFood)} />;
}
