import { Package, TrendingDown, Users } from "lucide-react";
import { Button } from "~/ui/button";

export default function Hero() {
	return (
		<section className="bg-gradient-to-r from-purple-600 via-pink-600 to-orange-500 py-20">
			<div className="container mx-auto px-4 text-center">
				<div className="mx-auto max-w-4xl">
					<h1 className="mb-6 font-bold text-5xl text-white md:text-6xl">
						El poder de comprar en{" "}
						<span className="bg-gradient-to-r from-yellow-300 to-orange-300 bg-clip-text text-transparent">
							comunidad
						</span>
					</h1>
					<p className="mx-auto mb-8 max-w-2xl text-purple-100 text-xl">
						Únete a miles de personas que ahorran comprando productos al por
						mayor. Mejores precios, mejor calidad, mejor planeta.
					</p>

					<div className="mb-12 flex flex-col justify-center gap-4 sm:flex-row">
						<Button
							size="lg"
							className="bg-white px-8 font-semibold text-purple-600 hover:bg-gray-100"
						>
							Comenzar a ahorrar
						</Button>
						<Button
							size="lg"
							variant="outline"
							className="border-white bg-transparent px-8 font-semibold text-white hover:bg-white hover:text-purple-600"
						>
							Ver cómo funciona
						</Button>
					</div>

					<div className="grid grid-cols-1 gap-8 text-white md:grid-cols-3">
						<div className="flex flex-col items-center">
							<Users className="mb-4 h-12 w-12 text-yellow-300" />
							<h3 className="mb-2 font-bold text-2xl">50,000+</h3>
							<p className="text-purple-100">Compradores activos</p>
						</div>
						<div className="flex flex-col items-center">
							<TrendingDown className="mb-4 h-12 w-12 text-yellow-300" />
							<h3 className="mb-2 font-bold text-2xl">40%</h3>
							<p className="text-purple-100">Ahorro promedio</p>
						</div>
						<div className="flex flex-col items-center">
							<Package className="mb-4 h-12 w-12 text-yellow-300" />
							<h3 className="mb-2 font-bold text-2xl">1,000+</h3>
							<p className="text-purple-100">Productos disponibles</p>
						</div>
					</div>
				</div>
			</div>
		</section>
	);
}
