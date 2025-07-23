import { Flame, Star } from "lucide-react";
import Image from "next/image";
import { Badge } from "~/ui/badge";
import { Button } from "~/ui/button";
import { Card, CardContent } from "~/ui/card";

const featuredProducts = [
	{
		id: 1,
		name: "Pack Snacks Saludables",
		image: "/placeholder.svg?height=200&width=200",
		price: 29.99,
		originalPrice: 45.99,
		rating: 4.8,
		reviews: 124,
		badge: "Más vendido",
	},
	{
		id: 2,
		name: "Cereales Integrales Mix",
		image: "/placeholder.svg?height=200&width=200",
		price: 35.99,
		originalPrice: 52.99,
		rating: 4.7,
		reviews: 89,
		badge: "Oferta especial",
	},
	{
		id: 3,
		name: "Frutos Secos Premium",
		image: "/placeholder.svg?height=200&width=200",
		price: 42.99,
		originalPrice: 65.99,
		rating: 4.9,
		reviews: 156,
		badge: "Nuevo",
	},
	{
		id: 4,
		name: "Especias del Mundo",
		image: "/placeholder.svg?height=200&width=200",
		price: 28.99,
		originalPrice: 39.99,
		rating: 4.6,
		reviews: 73,
		badge: "Limitado",
	},
];

export default function FeaturedOffers() {
	return (
		<section className="bg-gradient-to-br from-orange-50 to-red-50 py-20">
			<div className="container mx-auto px-4">
				<div className="mb-16 flex items-center justify-center">
					<Flame className="mr-3 h-8 w-8 text-orange-500" />
					<h2 className="font-bold text-4xl text-gray-800">
						Ofertas destacadas
					</h2>
				</div>

				<div className="mb-12 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
					{featuredProducts.map((product) => (
						<Card
							key={product.id}
							className="overflow-hidden border-2 border-orange-200 transition-all duration-300 hover:border-orange-400 hover:shadow-xl"
						>
							<div className="relative">
								<Image
									src={product.image || "/placeholder.svg"}
									alt={product.name}
									width={200}
									height={200}
									className="h-48 w-full object-cover"
								/>
								<Badge className="absolute top-2 left-2 bg-gradient-to-r from-orange-500 to-red-500">
									{product.badge}
								</Badge>
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
										({product.reviews})
									</span>
								</div>

								<div className="mb-4">
									<div className="flex items-center justify-between">
										<span className="font-bold text-orange-600 text-xl">
											${product.price}
										</span>
										<span className="text-gray-500 text-sm line-through">
											${product.originalPrice}
										</span>
									</div>
									<p className="font-medium text-green-600 text-xs">
										Ahorras $
										{(product.originalPrice - product.price).toFixed(2)}
									</p>
								</div>

								<Button className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600">
									Agregar al carrito
								</Button>
							</CardContent>
						</Card>
					))}
				</div>

				<div className="grid grid-cols-2 gap-4 md:grid-cols-4">
					{[1, 2, 3, 4, 5, 6, 7, 8].map((item) => (
						<div
							key={item}
							className="flex aspect-square items-center justify-center rounded-lg bg-gradient-to-br from-orange-100 to-red-100"
						>
							<Image
								src="/placeholder.svg?height=150&width=150"
								alt={`Featured ${item}`}
								width={150}
								height={150}
								className="h-full w-full rounded-lg object-cover opacity-60"
							/>
						</div>
					))}
				</div>
			</div>
		</section>
	);
}
