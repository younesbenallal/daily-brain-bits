import { Header } from "@/components/header";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
	return (
		<>
			<Header isMenuVisible />
			<main className="flex flex-col items-center snap-y snap-mandatory top-0">{children}</main>
		</>
	);
}
