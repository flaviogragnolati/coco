import { Bell, Gift, Mail, Star } from "lucide-react";
import { Button } from "~/ui/button";
import { Card, CardContent } from "~/ui/card";
import { Input } from "~/ui/input";

export default function Newsletter() {
	return (
		<section className="bg-gradient-to-r from-purple-600 via-pink-600 to-orange-500 py-20">
			<div className="container mx-auto px-4">
				<Card className="mx-auto max-w-4xl border-0 bg-white/95 shadow-2xl backdrop-blur-sm">
					<CardContent className="p-12">
						<div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-2">
							<div className="text-center lg:text-left">
								<div className="mb-4 flex items-center justify-center lg:justify-start">
									<div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-r from-purple-500 to-pink-500">
										<Mail className="h-8 w-8 text-white" />
									</div>
								</div>
								<h2 className="mb-4 font-bold text-3xl text-gray-800">
									Suscríbete para disfrutar de nuestras novedades, ofertas y
									beneficios
								</h2>
								<p className="mb-6 text-gray-600">
									Únete a más de 50,000 personas que reciben ofertas exclusivas,
									nuevos productos y tips para ahorrar comprando en comunidad.
								</p>

								<div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
									<div className="flex items-center">
										<Gift className="mr-2 h-5 w-5 text-purple-500" />
										<span className="text-gray-600 text-sm">
											Ofertas exclusivas
										</span>
									</div>
									<div className="flex items-center">
										<Bell className="mr-2 h-5 w-5 text-purple-500" />
										<span className="text-gray-600 text-sm">
											Nuevos productos
										</span>
									</div>
									<div className="flex items-center">
										<Star className="mr-2 h-5 w-5 text-purple-500" />
										<span className="text-gray-600 text-sm">
											Tips de ahorro
										</span>
									</div>
								</div>
							</div>

							<div className="space-y-4">
								<div className="flex flex-col gap-3 sm:flex-row">
									<Input
										type="email"
										placeholder="Tu correo electrónico"
										className="flex-1 border-2 border-purple-200 focus:border-purple-500"
									/>
									<Button className="bg-gradient-to-r from-purple-500 to-pink-500 px-8 hover:from-purple-600 hover:to-pink-600">
										Suscribirme
									</Button>
								</div>
								<p className="text-center text-gray-500 text-xs sm:text-left">
									Al suscribirte aceptas recibir comunicaciones de BulkBuy.
									Puedes cancelar en cualquier momento.
								</p>

								<div className="mt-6 rounded-lg bg-gradient-to-r from-purple-50 to-pink-50 p-4">
									<p className="mb-2 font-medium text-purple-700 text-sm">
										🎁 ¡Oferta de bienvenida!
									</p>
									<p className="text-gray-600 text-sm">
										Recibe un 15% de descuento en tu primera compra grupal al
										suscribirte.
									</p>
								</div>
							</div>
						</div>
					</CardContent>
				</Card>
			</div>
		</section>
	);
}
