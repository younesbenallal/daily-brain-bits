"use client";

import React, { useEffect, useState } from "react";

import { DefaultWrapper } from "@/components/Note";
import { Carousel, CarouselApi, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";

import { AuthStep } from "./auth-step";
import { PreferencesStep } from "./preference-step";
import { AddIntegrationsStep } from "./add-integrations-step";
import { ConfigureIntegrationsStep } from "./configure-integrations-step";
import { Button } from "@/components/ui/button";

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

	const steps = [AuthStep, PreferencesStep, AddIntegrationsStep, ConfigureIntegrationsStep];

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
					<CarouselNext />
				</Carousel>
				{current} {count}
			</div>
			<Button onClick={() => api?.scrollNext()}>Next</Button>
		</DefaultWrapper>
	);
}
