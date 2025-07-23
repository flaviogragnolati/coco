"use client";

import { Clock, Star, Users } from "lucide-react";
import Image from "next/image";
import { Badge } from "~/ui/badge";
import { Button } from "~/ui/button";
import { Card, CardContent } from "~/ui/card";

const products = [
	{
		id: 1,
		name: "Aceite de Oliva Premium",
		image: "/placeholder.svg?height=200&width=200",
		originalPrice: 45.99,
		groupPrice: 32.99,
		discount: 28,
		minQuantity: 20,
		currentParticipants: 15,
		timeLeft: "2 días",
		rating: 4.8,
	},
	{
		id: 2,
		name: "Quinoa Orgánica 5kg",
		image: "/placeholder.svg?height=200&width=200",
		originalPrice: 89.99,
		groupPrice: 65.99,
		discount: 27,
		minQuantity: 15,
		currentParticipants: 12,
		timeLeft: "5 días",
		rating: 4.9,
	},
	{
		id: 3,
		name: "Miel de Abeja Natural",
		image: "/placeholder.svg?height=200&width=200",
		originalPrice: 35.99,
		groupPrice: 24.99,
		discount: 31,
		minQuantity: 25,
		currentParticipants: 20,
		timeLeft: "1 día",
		rating: 4.7,
	},
	{
		id: 4,
		name: "Café Colombiano Premium",
		image: "/placeholder.svg?height=200&width=200",
		originalPrice: 55.99,
		groupPrice: 39.99,
		discount: 29,
		minQuantity: 18,
		currentParticipants: 18,
		timeLeft: "Completo",
		rating: 4.9,
	},
];

export default function ProductShowcase() {
	return (
		<section className="bg-white py-20">
			<div className="container mx-auto px-4">
				<div className="mb-16 text-center">
					<h2 className="mb-4 font-bold text-4xl text-gray-800">
						Activa el ahorro: productos que están a un paso del precio mayorista
					</h2>
					<p className="mx-auto max-w-3xl text-gray-600 text-xl">
						Únete a estos grupos de compra y desbloquea precios increíbles.
						Cuando alcancemos el mínimo de participantes, todos obtienen el
						descuento.
					</p>
				</div>

				<div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
					{products.map((product) => (
						<Card
							key={product.id}
							className="overflow-hidden border-2 border-gray-100 transition-shadow duration-300 hover:shadow-xl"
						>
							<div className="relative">
								<Image
									src={product.image || "/placeholder.svg"}
									alt={product.name}
									width={200}
									height={200}
									className="h-48 w-full object-cover"
								/>
								<Badge className="absolute top-2 right-2 bg-gradient-to-r from-red-500 to-pink-500">
									-{product.discount}%
								</Badge>
							</div>

							<CardContent className="p-4">
								<h3 className="mb-2 line-clamp-2 font-semibold text-gray-800">
									{product.name}
								</h3>

								<div className="mb-2 flex items-center">
									<Star className="h-4 w-4 fill-current text-yellow-500" />
									<span className="ml-1 text-gray-600 text-sm">
										{product.rating}
									</span>
								</div>

								<div className="mb-3">
									<div className="mb-1 flex items-center justify-between">
										<span className="text-gray-500 text-sm">
											Progreso del grupo
										</span>
										<span className="font-medium text-purple-600 text-sm">
											{product.currentParticipants}/{product.minQuantity}
										</span>
									</div>
									<div className="h-2 w-full rounded-full bg-gray-200">
										<div
											className="h-2 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-300"
											style={{
												width: `${(product.currentParticipants / product.minQuantity) * 100}%`,
											}}
										/>
									</div>
								</div>

								<div className="mb-3 flex items-center justify-between">
									<div className="flex items-center text-gray-500 text-sm">
										<Users className="mr-1 h-4 w-4" />
										<span>{product.currentParticipants} unidos</span>
									</div>
									<div className="flex items-center text-orange-500 text-sm">
										<Clock className="mr-1 h-4 w-4" />
										<span>{product.timeLeft}</span>
									</div>
								</div>

								<div className="mb-4">
									<div className="flex items-center justify-between">
										<span className="font-bold text-green-600 text-lg">
											${product.groupPrice}
										</span>
										<span className="text-gray-500 text-sm line-through">
											${product.originalPrice}
										</span>
									</div>
									<p className="text-gray-500 text-xs">Precio grupal</p>
								</div>

								<Button
									className={`w-full ${
										product.timeLeft === "Completo"
											? "bg-green-500 hover:bg-green-600"
											: "bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
									}`}
									disabled={product.timeLeft === "Completo"}
									onClick={() => {
										// This would open the PaymentModal with the product data
										console.log("Opening payment modal for:", product.name);
									}}
								>
									{product.timeLeft === "Completo"
										? "¡Grupo completo!"
										: "Unirme al grupo"}
								</Button>
							</CardContent>
						</Card>
					))}
				</div>

				<div className="grid grid-cols-2 gap-4 md:grid-cols-4">
					{[1, 2, 3, 4, 5, 6, 7, 8].map((item) => (
						<div
							key={item}
							className="flex aspect-square items-center justify-center rounded-lg bg-gray-100"
						>
							<Image
								src="/placeholder.svg?height=150&width=150"
								alt={`Product ${item}`}
								width={150}
								height={150}
								className="h-full w-full rounded-lg object-cover opacity-50"
							/>
						</div>
					))}
				</div>
			</div>
		</section>
	);
}
