"use client";

import * as React from "react";

import { Carousel, CarouselApi, CarouselContent, CarouselItem } from "@/components/ui/carousel";
import { Button } from "@/components/ui/button";
import { ArrowLeftIcon, ArrowRightIcon } from "@heroicons/react/20/solid";

interface OnboardingStepsProps extends React.ComponentPropsWithoutRef<"div"> {
	steps: React.JSX.Element[];
}
export function OnboardingSteps({ steps, ...props }: OnboardingStepsProps) {
	const [api, setApi] = React.useState<CarouselApi>();

	return (
		<>
			<div>
				<Carousel setApi={setApi}>
					<CarouselContent>
						{steps.map((step, i) => (
							<CarouselItem key={i}>{step}</CarouselItem>
						))}
					</CarouselContent>
				</Carousel>
			</div>
			<div className="flex items-end justify-between py-6">
				<Button size="lg" variant="outline" onClick={() => api?.scrollPrev()}>
					<ArrowLeftIcon className="w-4 h-4 mr-2" />
					Previous
				</Button>
				<Button size="lg" onClick={() => api?.scrollNext()}>
					Next <ArrowRightIcon className="w-4 h-4 ml-2" />
				</Button>
			</div>
		</>
	);
}
