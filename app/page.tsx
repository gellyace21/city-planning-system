// /app/page.tsx
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export const metadata = {
  title: "Home",
};

export default async function Page() {
  const session = await getServerSession(authOptions);
  const role = session?.user?.role;

  if (role === "admin") {
    redirect("/dashboard");
  }

  if (role === "superadmin") {
    redirect("/dashboard/superadmin");
  }

  if (role === "lead") {
    redirect("/dashboard/annual-investment-plan");
  }

  redirect("/login");
}
