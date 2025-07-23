import { ChevronRight, Star, Wheat } from "lucide-react";
import Image from "next/image";
import { Badge } from "~/ui/badge";
import { Button } from "~/ui/button";
import { Card, CardContent } from "~/ui/card";

const glutenFreeProducts = [
	{
		id: 1,
		name: "Pan Sin Gluten Artesanal",
		image: "/placeholder.svg?height=200&width=200",
		price: 18.99,
		rating: 4.8,
		certified: true,
	},
	{
		id: 2,
		name: "Pasta de Arroz Integral",
		image: "/placeholder.svg?height=200&width=200",
		price: 22.99,
		rating: 4.7,
		certified: true,
	},
	{
		id: 3,
		name: "Galletas de Avena Sin Gluten",
		image: "/placeholder.svg?height=200&width=200",
		price: 15.99,
		rating: 4.9,
		certified: true,
	},
	{
		id: 4,
		name: "Harina de Almendra",
		image: "/placeholder.svg?height=200&width=200",
		price: 25.99,
		rating: 4.6,
		certified: true,
	},
];

export default function GlutenFree() {
	return (
		<section className="bg-gradient-to-br from-green-50 to-teal-50 py-20">
			<div className="container mx-auto px-4">
				<div className="mb-16 flex items-center justify-center">
					<Wheat className="mr-3 h-8 w-8 text-green-500" />
					<h2 className="font-bold text-4xl text-gray-800">Sin gluten</h2>
				</div>

				<div className="mb-12 text-center">
					<p className="mx-auto max-w-2xl text-gray-600 text-xl">
						Descubre nuestra selección especial de productos certificados sin
						gluten, perfectos para una alimentación saludable y segura.
					</p>
				</div>

				<div className="mb-12 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
					{glutenFreeProducts.map((product) => (
						<Card
							key={product.id}
							className="overflow-hidden border-2 border-green-200 transition-all duration-300 hover:border-green-400 hover:shadow-xl"
						>
							<div className="relative">
								<Image
									src={product.image || "/placeholder.svg"}
									alt={product.name}
									width={200}
									height={200}
									className="h-48 w-full object-cover"
								/>
								{product.certified && (
									<Badge className="absolute top-2 right-2 bg-gradient-to-r from-green-500 to-teal-500">
										Certificado
									</Badge>
								)}
							</div>

							<CardContent className="p-4">
								<h3 className="mb-2 line-clamp-2 font-semibold text-gray-800">
									{product.name}
								</h3>

								<div className="mb-3 flex items-center">
									<div className="flex items-center">
										{[...Array(5)].map((_, i) => (
											<Star
												key={i}
												className={`h-4 w-4 ${i < Math.floor(product.rating) ? "fill-current text-yellow-500" : "text-gray-300"}`}
											/>
										))}
									</div>
									<span className="ml-2 text-gray-600 text-sm">
										{product.rating}
									</span>
								</div>

								<div className="mb-4">
									<span className="font-bold text-green-600 text-xl">
										${product.price}
									</span>
								</div>

								<Button className="w-full bg-gradient-to-r from-green-500 to-teal-500 hover:from-green-600 hover:to-teal-600">
									Ver producto
								</Button>
							</CardContent>
						</Card>
					))}
				</div>

				<div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4">
					{[1, 2, 3, 4, 5, 6, 7, 8].map((item) => (
						<div
							key={item}
							className="flex aspect-square items-center justify-center rounded-lg bg-gradient-to-br from-green-100 to-teal-100"
						>
							<Image
								src="/placeholder.svg?height=150&width=150"
								alt={`Gluten Free ${item}`}
								width={150}
								height={150}
								className="h-full w-full rounded-lg object-cover opacity-60"
							/>
						</div>
					))}
				</div>

				<div className="text-center">
					<Button
						size="lg"
						variant="outline"
						className="border-green-500 bg-transparent text-green-600 hover:bg-green-50"
					>
						Ver todos los productos sin gluten
						<ChevronRight className="ml-2 h-4 w-4" />
					</Button>
				</div>
			</div>
		</section>
	);
}
