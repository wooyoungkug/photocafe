import { Metadata } from "next";

export const metadata: Metadata = {
  title: "printing114 - 대시보드",
  icons: {
    icon: "/favicon-red.svg",
  },
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
