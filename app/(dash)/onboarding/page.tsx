"use client";

import React from "react";

import { Carousel, CarouselApi, CarouselContent, CarouselItem } from "@/components/ui/carousel";
import { Button } from "@/components/ui/button";
import { DefaultWrapper } from "@/components/default-wrapper";

import { PreferencesStep } from "./preference-step";
import { AddSourcesStep } from "./add-sources-step";
import { ConfigureIntegrationsStep } from "./configure-sources-step";
import { ArrowRightIcon } from "@heroicons/react/20/solid";

export default function OnboardingPage() {
	const [api, setApi] = React.useState<CarouselApi>();
	const [current, setCurrent] = React.useState(0);
	const [count, setCount] = React.useState(0);

	React.useEffect(() => {
		if (!api) {
			return;
		}

		setCount(api.scrollSnapList().length);
		setCurrent(api.selectedScrollSnap() + 1);

		api.on("select", () => {
			setCurrent(api.selectedScrollSnap() + 1);
		});
	}, [api]);

	const steps = [PreferencesStep, AddSourcesStep, ConfigureIntegrationsStep];

	return (
		<DefaultWrapper>
			<div>
				<Carousel setApi={setApi}>
					<CarouselContent>
						{steps.map((Step, i) => (
							<CarouselItem key={i}>
								<Step />
							</CarouselItem>
						))}
					</CarouselContent>
				</Carousel>
			</div>
			<div className="flex justify-end items-end py-6">
				<Button size="lg" onClick={() => api?.scrollNext()}>
					Next <ArrowRightIcon className="ml-2 w-4 h-4" />
				</Button>
			</div>
		</DefaultWrapper>
	);
}
