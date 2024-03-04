type IconProps = React.HTMLAttributes<SVGElement>;

export const Icons = {
	google: (props: IconProps) => (
		<svg role="img" viewBox="0 0 24 24" {...props}>
			<path
				fill="currentColor"
				d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"
			/>
		</svg>
	),
	apple: (props: IconProps) => (
		<svg role="img" viewBox="0 0 24 24" {...props}>
			<path
				d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701"
				fill="currentColor"
			/>
		</svg>
	),

	notion: (props: IconProps) => (
		<svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
			<g>
				<path
					fillRule="evenodd"
					clipRule="evenodd"
					d="M5.716 29.2178L2.27664 24.9331C1.44913 23.9023 1 22.6346 1 21.3299V5.81499C1 3.86064 2.56359 2.23897 4.58071 2.10125L20.5321 1.01218C21.691 0.933062 22.8428 1.24109 23.7948 1.8847L29.3992 5.67391C30.4025 6.35219 31 7.46099 31 8.64426V26.2832C31 28.1958 29.4626 29.7793 27.4876 29.9009L9.78333 30.9907C8.20733 31.0877 6.68399 30.4237 5.716 29.2178Z"
					fill="white"
				></path>{" "}
				<path
					d="M11.2481 13.5787V13.3756C11.2481 12.8607 11.6605 12.4337 12.192 12.3982L16.0633 12.1397L21.417 20.0235V13.1041L20.039 12.9204V12.824C20.039 12.303 20.4608 11.8732 20.9991 11.8456L24.5216 11.6652V12.1721C24.5216 12.41 24.3446 12.6136 24.1021 12.6546L23.2544 12.798V24.0037L22.1906 24.3695C21.3018 24.6752 20.3124 24.348 19.8036 23.5803L14.6061 15.7372V23.223L16.2058 23.5291L16.1836 23.6775C16.1137 24.1423 15.7124 24.4939 15.227 24.5155L11.2481 24.6926C11.1955 24.1927 11.5701 23.7456 12.0869 23.6913L12.6103 23.6363V13.6552L11.2481 13.5787Z"
					fill="#000000"
				></path>{" "}
				<path
					fillRule="evenodd"
					clipRule="evenodd"
					d="M20.6749 2.96678L4.72347 4.05585C3.76799 4.12109 3.02734 4.88925 3.02734 5.81499V21.3299C3.02734 22.1997 3.32676 23.0448 3.87843 23.7321L7.3178 28.0167C7.87388 28.7094 8.74899 29.0909 9.65435 29.0352L27.3586 27.9454C28.266 27.8895 28.9724 27.1619 28.9724 26.2832V8.64426C28.9724 8.10059 28.6979 7.59115 28.2369 7.27951L22.6325 3.49029C22.0613 3.10413 21.3702 2.91931 20.6749 2.96678ZM5.51447 6.057C5.29261 5.89274 5.3982 5.55055 5.6769 5.53056L20.7822 4.44711C21.2635 4.41259 21.7417 4.54512 22.1309 4.82088L25.1617 6.96813C25.2767 7.04965 25.2228 7.22563 25.0803 7.23338L9.08387 8.10336C8.59977 8.12969 8.12193 7.98747 7.73701 7.7025L5.51447 6.057ZM8.33357 10.8307C8.33357 10.311 8.75341 9.88177 9.29027 9.85253L26.203 8.93145C26.7263 8.90296 27.1667 9.30534 27.1667 9.81182V25.0853C27.1667 25.604 26.7484 26.0328 26.2126 26.0633L9.40688 27.0195C8.8246 27.0527 8.33357 26.6052 8.33357 26.0415V10.8307Z"
					fill="#000000"
				></path>{" "}
			</g>
		</svg>
	),

	obsidian: (props: IconProps) => (
		<svg xmlns="http://www.w3.org/2000/svg" width="0.78em" height="1em" viewBox="0 0 256 332" {...props}>
			<defs>
				<radialGradient
					id="logosObsidianIcon0"
					cx="72.819%"
					cy="96.934%"
					r="163.793%"
					fx="72.819%"
					fy="96.934%"
					gradientTransform="rotate(-104 11141.322 0)"
				>
					<stop offset="0%" stopColor="#fff" stopOpacity="0.4" />
					<stop offset="100%" stopOpacity="0.1" />
				</radialGradient>
				<radialGradient
					id="logosObsidianIcon1"
					cx="52.917%"
					cy="90.632%"
					r="190.361%"
					fx="52.917%"
					fy="90.632%"
					gradientTransform="rotate(-82 10746.75 0)"
				>
					<stop offset="0%" stopColor="#fff" stopOpacity="0.6" />
					<stop offset="100%" stopColor="#fff" stopOpacity="0.1" />
				</radialGradient>
				<radialGradient
					id="logosObsidianIcon2"
					cx="31.174%"
					cy="97.138%"
					r="178.714%"
					fx="31.174%"
					fy="97.138%"
					gradientTransform="rotate(-77 10724.606 0)"
				>
					<stop offset="0%" stopColor="#fff" stopOpacity="0.8" />
					<stop offset="100%" stopColor="#fff" stopOpacity="0.4" />
				</radialGradient>
				<radialGradient
					id="logosObsidianIcon3"
					cx="71.813%"
					cy="99.994%"
					r="92.086%"
					fx="71.813%"
					fy="99.994%"
					gradientTransform="translate(0 22251839.658)skewY(-90)"
				>
					<stop offset="0%" stopColor="#fff" stopOpacity="0.3" />
					<stop offset="100%" stopOpacity="0.3" />
				</radialGradient>
				<radialGradient
					id="logosObsidianIcon4"
					cx="117.013%"
					cy="34.769%"
					r="328.729%"
					fx="117.013%"
					fy="34.769%"
					gradientTransform="rotate(102 -1004.443 0)"
				>
					<stop offset="0%" stopColor="#fff" stopOpacity="0" />
					<stop offset="100%" stopColor="#fff" stopOpacity="0.2" />
				</radialGradient>
				<radialGradient
					id="logosObsidianIcon5"
					cx="-9.431%"
					cy="8.712%"
					r="153.492%"
					fx="-9.431%"
					fy="8.712%"
					gradientTransform="rotate(45 1674.397 0)"
				>
					<stop offset="0%" stopColor="#fff" stopOpacity="0.2" />
					<stop offset="100%" stopColor="#fff" stopOpacity="0.4" />
				</radialGradient>
				<radialGradient
					id="logosObsidianIcon6"
					cx="103.902%"
					cy="-22.172%"
					r="394.771%"
					fx="103.902%"
					fy="-22.172%"
					gradientTransform="rotate(80 3757.522 0)"
				>
					<stop offset="0%" stopColor="#fff" stopOpacity="0.1" />
					<stop offset="100%" stopColor="#fff" stopOpacity="0.3" />
				</radialGradient>
				<radialGradient
					id="logosObsidianIcon7"
					cx="99.348%"
					cy="89.193%"
					r="203.824%"
					fx="99.348%"
					fy="89.193%"
					gradientTransform="translate(0 -38783246.548)skewY(-90)"
				>
					<stop offset="0%" stopColor="#fff" stopOpacity="0.2" />
					<stop offset="50%" stopColor="#fff" stopOpacity="0.2" />
					<stop offset="100%" stopColor="#fff" stopOpacity="0.3" />
				</radialGradient>
			</defs>
			<path
				fillOpacity="0.3"
				d="M209.056 308.305c-2.043 14.93-16.738 26.638-31.432 22.552c-20.823-5.658-44.946-14.616-66.634-16.266l-33.317-2.515a22.002 22.002 0 0 1-14.144-6.522L6.167 246.778a21.766 21.766 0 0 1-4.244-24.124s35.36-77.478 36.775-81.485c1.257-4.008 6.13-39.211 8.958-58.07a22.002 22.002 0 0 1 7.072-12.965L122.462 9.47a22.002 22.002 0 0 1 31.903 2.672l57.048 71.978a23.18 23.18 0 0 1 4.872 14.38c0 13.594 1.179 41.646 8.8 59.72a236.756 236.756 0 0 0 27.974 45.732a11.001 11.001 0 0 1 .786 12.258c-4.95 8.408-14.851 24.595-28.76 45.26a111.738 111.738 0 0 0-16.108 46.834z"
			/>
			<path
				fill="#6c31e3"
				d="M209.606 305.79c-2.043 15.009-16.737 26.717-31.432 22.71c-20.744-5.737-44.79-14.695-66.555-16.345L78.38 309.64a21.923 21.923 0 0 1-14.144-6.6L6.874 244.106a21.923 21.923 0 0 1-4.243-24.36s35.438-77.792 36.774-81.878c1.336-4.007 6.13-39.289 8.958-58.305a22.002 22.002 0 0 1 7.072-13.044L123.17 5.621a22.002 22.002 0 0 1 31.902 2.75l56.97 72.292a23.338 23.338 0 0 1 4.871 14.38c0 13.673 1.18 41.804 8.723 59.955a238.092 238.092 0 0 0 27.974 45.969a11.001 11.001 0 0 1 .864 12.336c-5.03 8.487-14.851 24.674-28.838 45.497a112.603 112.603 0 0 0-16.03 46.99"
			/>
			<path
				fill="url(#logosObsidianIcon0)"
				d="M70.365 307.44c26.638-53.983 25.93-92.722 14.537-120.225c-10.372-25.459-29.781-41.489-45.025-51.468a19.233 19.233 0 0 1-1.415 4.243L2.631 219.747a21.923 21.923 0 0 0 4.321 24.36l57.284 58.933a23.762 23.762 0 0 0 6.129 4.4"
			/>
			<path
				fill="url(#logosObsidianIcon1)"
				d="M142.814 197.902a86.025 86.025 0 0 1 21.06 4.793c21.844 8.172 41.724 26.56 58.147 61.999c1.179-2.043 2.357-4.008 3.615-5.894a960.226 960.226 0 0 0 28.838-45.497a11.001 11.001 0 0 0-.786-12.336a238.092 238.092 0 0 1-28.052-45.969c-7.544-18.073-8.644-46.282-8.723-59.955c0-5.186-1.65-10.294-4.871-14.38l-56.97-72.292l-.943-1.178c4.165 13.75 3.93 24.752 1.336 34.731c-2.357 9.272-6.757 17.68-11.394 26.56c-1.571 2.986-3.143 6.05-4.636 9.193a110.01 110.01 0 0 0-12.415 45.576c-.786 19.016 3.064 42.825 15.716 74.65z"
			/>
			<path
				fill="url(#logosObsidianIcon2)"
				d="M142.736 197.902c-12.652-31.824-16.502-55.633-15.716-74.65c.786-18.858 6.286-33.002 12.415-45.575l4.715-9.193c4.558-8.88 8.88-17.288 11.315-26.56a61.684 61.684 0 0 0-1.336-34.731c-8.136-8.94-21.96-9.642-30.96-1.572L55.436 66.519a22.002 22.002 0 0 0-7.072 13.044l-8.25 54.69c0 .55-.158 1.022-.236 1.572c15.244 9.901 34.574 25.931 45.025 51.312c2.043 5.029 3.772 10.294 5.029 16.03a157.157 157.157 0 0 1 52.805-5.343z"
			/>
			<path
				fill="url(#logosObsidianIcon3)"
				d="M178.253 328.5c14.616 4.007 29.31-7.701 31.353-22.789a120.225 120.225 0 0 1 12.494-41.017c-16.502-35.44-36.382-53.827-58.148-61.999c-23.18-8.643-48.404-5.736-74.021.472c5.736 26.01 2.357 60.034-19.487 104.273c2.436 1.257 5.186 1.965 7.936 2.2l34.496 2.593c18.701 1.336 46.597 11.001 65.377 16.266"
			/>
			<path
				fill="url(#logosObsidianIcon4)"
				d="M127.177 122.074c-.864 18.859 1.493 40.39 14.144 72.135l-3.929-.393c-11.394-33.081-13.908-50.054-13.044-69.149c.786-19.094 6.994-33.789 13.123-46.361c1.571-3.143 5.186-9.037 6.758-12.023c4.557-8.879 7.622-13.515 10.215-21.609c3.772-11.315 2.986-16.658 2.514-22.001c2.908 19.251-8.172 35.988-16.501 53.04a113.939 113.939 0 0 0-13.358 46.361z"
			/>
			<path
				fill="url(#logosObsidianIcon5)"
				d="M88.674 188.551c1.571 3.458 2.907 6.287 3.85 10.608l-3.379.786c-1.336-5.029-2.357-8.643-4.322-12.965c-11.472-26.953-29.86-40.861-44.79-51.076c18.074 9.744 36.697 25.066 48.64 52.647"
			/>
			<path
				fill="url(#logosObsidianIcon6)"
				d="M92.681 202.617c6.286 29.467-.786 66.948-21.609 103.409c17.445-36.146 25.931-70.8 18.859-102.938l2.75-.55z"
			/>
			<path
				fill="url(#logosObsidianIcon7)"
				d="M164.659 199.867c34.181 12.808 47.383 40.86 57.205 64.355c-12.18-24.516-29.074-51.626-58.462-61.684c-22.317-7.7-41.175-6.758-73.471.55l-.707-3.143c34.26-7.858 52.176-8.8 75.435 0z"
			/>
		</svg>
	),
	spinner: (props: IconProps) => (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			width="24"
			height="24"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round"
			{...props}
		>
			<path d="M21 12a9 9 0 1 16.219-8.56" />
		</svg>
	),
};
