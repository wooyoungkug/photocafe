import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Photocafe - 대시보드",
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
