import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "~/components/ui/accordion";
import { faqItems } from "../home-content";
import { SectionHeading } from "./section-heading";

export function FaqSection() {
	return (
		<section
			className="scroll-mt-20 bg-brand-warm px-4 py-16 text-brand-warm-foreground md:px-6 md:py-20"
			id="preguntas-frecuentes"
		>
			<div className="mx-auto grid w-full max-w-7xl gap-8 lg:grid-cols-[minmax(0,0.7fr)_minmax(0,1.3fr)] lg:gap-16">
				<SectionHeading
					description="Lo esencial sobre el registro, el pago y el seguimiento de tu compra."
					eyebrow="Ayuda rápida"
					title="Preguntas frecuentes"
				/>
				<Accordion collapsible type="single">
					{faqItems.map((item, index) => (
						<AccordionItem key={item.question} value={`faq-${index + 1}`}>
							<AccordionTrigger>{item.question}</AccordionTrigger>
							<AccordionContent>{item.answer}</AccordionContent>
						</AccordionItem>
					))}
				</Accordion>
			</div>
		</section>
	);
}
