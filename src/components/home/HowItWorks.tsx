import {
	Gift,
	Package,
	Search,
	ShoppingCart,
	Star,
	Truck,
	Users,
} from "lucide-react";
import { Card, CardContent } from "~/ui/card";

const steps = [
	{
		number: 1,
		icon: Search,
		title: "Explora productos",
		description:
			"Descubre miles de productos de calidad con precios especiales para compras grupales.",
		color: "from-blue-500 to-cyan-500",
	},
	{
		number: 2,
		icon: Users,
		title: "Únete al grupo",
		description:
			"Forma parte de un grupo de compra o crea uno nuevo con tus amigos y vecinos.",
		color: "from-purple-500 to-pink-500",
	},
	{
		number: 3,
		icon: ShoppingCart,
		title: "Realiza tu pedido",
		description:
			"Agrega productos a tu carrito y confirma tu participación en la compra grupal.",
		color: "from-green-500 to-emerald-500",
	},
	{
		number: 4,
		icon: Package,
		title: "Alcanza el mínimo",
		description:
			"Cuando el grupo alcanza la cantidad mínima, se activa el descuento especial.",
		color: "from-orange-500 to-red-500",
	},
	{
		number: 5,
		icon: Truck,
		title: "Recibe tu pedido",
		description:
			"Los productos se envían directamente a tu domicilio o punto de recogida.",
		color: "from-indigo-500 to-purple-500",
	},
	{
		number: 6,
		icon: Star,
		title: "Califica y comparte",
		description:
			"Evalúa tu experiencia y comparte con otros para crear una comunidad fuerte.",
		color: "from-yellow-500 to-orange-500",
	},
	{
		number: 7,
		icon: Gift,
		title: "Disfruta los beneficios",
		description:
			"Accede a ofertas exclusivas y descuentos especiales por ser parte de la comunidad.",
		color: "from-pink-500 to-rose-500",
	},
];

export default function HowItWorks() {
	return (
		<section className="bg-white py-20">
			<div className="container mx-auto px-4">
				<div className="mb-16 text-center">
					<h2 className="mb-4 font-bold text-4xl text-gray-800">
						¿Cómo funciona BulkBuy?
					</h2>
					<p className="mx-auto max-w-2xl text-gray-600 text-xl">
						Comprar en grupo nunca fue tan fácil. Sigue estos simples pasos y
						comienza a ahorrar hoy mismo.
					</p>
				</div>

				<div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
					{steps.map((step, index) => {
						const Icon = step.icon;
						return (
							<Card
								key={step.number}
								className="relative overflow-hidden border-2 border-gray-100 transition-shadow duration-300 hover:shadow-xl"
							>
								<CardContent className="p-6">
									<div
										className={`h-12 w-12 rounded-full bg-gradient-to-r ${step.color} mb-4 flex items-center justify-center`}
									>
										<span className="font-bold text-lg text-white">
											{step.number}
										</span>
									</div>
									<Icon
										className={`mb-4 h-8 w-8 bg-gradient-to-r ${step.color} bg-clip-text text-transparent`}
									/>
									<h3 className="mb-2 font-semibold text-gray-800 text-lg">
										{step.title}
									</h3>
									<p className="text-gray-600 text-sm leading-relaxed">
										{step.description}
									</p>
								</CardContent>
							</Card>
						);
					})}
				</div>

				<div className="mt-8 flex justify-center">
					<div className="flex space-x-2">
						{[0, 1, 2, 3, 4].map((dot) => (
							<div
								key={dot}
								className={`h-3 w-3 rounded-full ${dot === 0 ? "bg-purple-500" : "bg-gray-300"}`}
							/>
						))}
					</div>
				</div>
			</div>
		</section>
	);
}
