import { DefaultWrapper } from "@/components/default-wrapper";

export default async function Layout({ children }: { children: React.ReactNode }) {
	return <DefaultWrapper>{children}</DefaultWrapper>;
}
