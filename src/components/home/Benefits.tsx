import { DollarSign, Heart, Leaf, Shield } from "lucide-react";
import { Card, CardContent } from "~/ui/card";

export default function Benefits() {
	return (
		<section className="bg-gradient-to-br from-green-50 to-blue-50 py-20">
			<div className="container mx-auto px-4">
				<div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2">
					<div>
						<h2 className="mb-6 font-bold text-4xl text-gray-800">
							Beneficios
						</h2>
						<div className="space-y-6">
							<div className="flex items-start space-x-4">
								<div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-r from-green-500 to-emerald-500">
									<DollarSign className="h-6 w-6 text-white" />
								</div>
								<div>
									<h3 className="mb-2 font-semibold text-gray-800 text-xl">
										Precios más bajos
									</h3>
									<p className="text-gray-600">
										Accede a precios mayoristas comprando en grupo con tu
										comunidad.
									</p>
								</div>
							</div>

							<div className="flex items-start space-x-4">
								<div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-r from-blue-500 to-cyan-500">
									<Leaf className="h-6 w-6 text-white" />
								</div>
								<div>
									<h3 className="mb-2 font-semibold text-gray-800 text-xl">
										Impacto ambiental
									</h3>
									<p className="text-gray-600">
										Reduce el empaque y las emisiones comprando productos
										locales en volumen.
									</p>
								</div>
							</div>

							<div className="flex items-start space-x-4">
								<div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-r from-purple-500 to-pink-500">
									<Heart className="h-6 w-6 text-white" />
								</div>
								<div>
									<h3 className="mb-2 font-semibold text-gray-800 text-xl">
										Comunidad fuerte
									</h3>
									<p className="text-gray-600">
										Conecta con vecinos y amigos mientras ahorras dinero juntos.
									</p>
								</div>
							</div>

							<div className="flex items-start space-x-4">
								<div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-r from-orange-500 to-red-500">
									<Shield className="h-6 w-6 text-white" />
								</div>
								<div>
									<h3 className="mb-2 font-semibold text-gray-800 text-xl">
										Calidad garantizada
									</h3>
									<p className="text-gray-600">
										Productos verificados y de alta calidad de proveedores
										confiables.
									</p>
								</div>
							</div>
						</div>
					</div>

					<div>
						<h2 className="mb-6 font-bold text-4xl text-gray-800">
							¿Qué dice nuestra comunidad?
						</h2>
						<Card className="border-purple-500 border-l-4 bg-white shadow-lg">
							<CardContent className="p-6">
								<p className="mb-4 text-gray-600 italic">
									"Desde que uso BulkBuy he ahorrado más del 30% en mis compras
									mensuales. Además, he conocido a mis vecinos y creamos una red
									de apoyo increíble."
								</p>
								<div className="flex items-center">
									<div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-r from-purple-500 to-pink-500 font-bold text-white">
										M
									</div>
									<div className="ml-3">
										<p className="font-semibold text-gray-800">
											María González
										</p>
										<p className="text-gray-500 text-sm">Usuaria desde 2023</p>
									</div>
								</div>
							</CardContent>
						</Card>
					</div>
				</div>
			</div>
		</section>
	);
}
