"use client";

import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from "@/components/ui/select";
import { updateUserProfile } from "@/lib/user";
import { Enums } from "@/types/db";
interface PreferencesStepProps extends React.ComponentPropsWithoutRef<"div"> {}
export function PreferencesStep({ ...props }: PreferencesStepProps) {
	return (
		<div className="space-y-8">
			<div>
				<h2>Gimme your preferences</h2>
				<p className="">Help us craft your experience to your wishes.</p>
			</div>
			<div className="space-y-2">
				<Label>Timezone</Label>
				<Select onValueChange={(value) => updateUserProfile({ timezone: value })}>
					<SelectTrigger className="">
						<SelectValue placeholder="Select a timezone" />
					</SelectTrigger>
					<SelectContent>
						<SelectGroup>
							<SelectLabel>North America</SelectLabel>
							<SelectItem value="est">Eastern Standard Time (EST)</SelectItem>
							<SelectItem value="cst">Central Standard Time (CST)</SelectItem>
							<SelectItem value="mst">Mountain Standard Time (MST)</SelectItem>
							<SelectItem value="pst">Pacific Standard Time (PST)</SelectItem>
							<SelectItem value="akst">Alaska Standard Time (AKST)</SelectItem>
							<SelectItem value="hst">Hawaii Standard Time (HST)</SelectItem>
						</SelectGroup>
						<SelectGroup>
							<SelectLabel>Europe & Africa</SelectLabel>
							<SelectItem value="gmt">Greenwich Mean Time (GMT)</SelectItem>
							<SelectItem value="cet">Central European Time (CET)</SelectItem>
							<SelectItem value="eet">Eastern European Time (EET)</SelectItem>
							<SelectItem value="west">Western European Summer Time (WEST)</SelectItem>
							<SelectItem value="cat">Central Africa Time (CAT)</SelectItem>
							<SelectItem value="eat">East Africa Time (EAT)</SelectItem>
						</SelectGroup>
						<SelectGroup>
							<SelectLabel>Asia</SelectLabel>
							<SelectItem value="msk">Moscow Time (MSK)</SelectItem>
							<SelectItem value="ist">India Standard Time (IST)</SelectItem>
							<SelectItem value="cst_china">China Standard Time (CST)</SelectItem>
							<SelectItem value="jst">Japan Standard Time (JST)</SelectItem>
							<SelectItem value="kst">Korea Standard Time (KST)</SelectItem>
							<SelectItem value="ist_indonesia">Indonesia Central Standard Time (WITA)</SelectItem>
						</SelectGroup>
						<SelectGroup>
							<SelectLabel>Australia & Pacific</SelectLabel>
							<SelectItem value="awst">Australian Western Standard Time (AWST)</SelectItem>
							<SelectItem value="acst">Australian Central Standard Time (ACST)</SelectItem>
							<SelectItem value="aest">Australian Eastern Standard Time (AEST)</SelectItem>
							<SelectItem value="nzst">New Zealand Standard Time (NZST)</SelectItem>
							<SelectItem value="fjt">Fiji Time (FJT)</SelectItem>
						</SelectGroup>
						<SelectGroup>
							<SelectLabel>South America</SelectLabel>
							<SelectItem value="art">Argentina Time (ART)</SelectItem>
							<SelectItem value="bot">Bolivia Time (BOT)</SelectItem>
							<SelectItem value="brt">Brasilia Time (BRT)</SelectItem>
							<SelectItem value="clt">Chile Standard Time (CLT)</SelectItem>
						</SelectGroup>
					</SelectContent>
				</Select>
			</div>
			<div className="space-y-2">
				<Label>Email frequency</Label>
				<Select onValueChange={(value) => updateUserProfile({ email_frequency: value as Enums<"profile_email_frequency"> })}>
					<SelectTrigger className="">
						<SelectValue defaultValue="daily" placeholder="Frequency" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="daily">Daily</SelectItem>
						<SelectItem value="weekly">Weekly</SelectItem>
					</SelectContent>
				</Select>
			</div>
		</div>
	);
}
