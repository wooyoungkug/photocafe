import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin Login - Printing114",
  description: "관리자 로그인",
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
