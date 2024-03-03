import { Header } from "@/components/header";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
	return (
		<>
			<Header isMenuVisible />
			<main className="top-0 flex flex-col items-center snap-y snap-mandatory">{children}</main>
		</>
	);
}
