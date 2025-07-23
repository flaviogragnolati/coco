import {
	Facebook,
	Instagram,
	Mail,
	MessageCircle,
	Phone,
	Twitter,
} from "lucide-react";
import { Button } from "~/ui/button";

export default function Footer() {
	return (
		<footer className="bg-gray-900 text-white">
			<div className="container mx-auto px-4 py-16">
				<div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4">
					<div>
						<h3 className="mb-4 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text font-bold text-transparent text-xl">
							BulkBuy
						</h3>
						<p className="mb-4 text-gray-400">
							La plataforma que revoluciona la forma de comprar, conectando
							comunidades para obtener mejores precios.
						</p>
						<div className="flex space-x-4">
							<Button
								size="sm"
								variant="outline"
								className="border-gray-600 bg-transparent text-gray-400 hover:border-white hover:text-white"
							>
								<Facebook className="h-4 w-4" />
							</Button>
							<Button
								size="sm"
								variant="outline"
								className="border-gray-600 bg-transparent text-gray-400 hover:border-white hover:text-white"
							>
								<Instagram className="h-4 w-4" />
							</Button>
							<Button
								size="sm"
								variant="outline"
								className="border-gray-600 bg-transparent text-gray-400 hover:border-white hover:text-white"
							>
								<Twitter className="h-4 w-4" />
							</Button>
						</div>
					</div>

					<div>
						<h4 className="mb-4 font-semibold text-lg">Empresa</h4>
						<ul className="space-y-2 text-gray-400">
							<li>
								<a href="#" className="transition-colors hover:text-white">
									Términos y condiciones
								</a>
							</li>
							<li>
								<a href="#" className="transition-colors hover:text-white">
									Preguntas frecuentes
								</a>
							</li>
							<li>
								<a href="#" className="transition-colors hover:text-white">
									Contactanos
								</a>
							</li>
							<li>
								<a href="#" className="transition-colors hover:text-white">
									Nuestra historia
								</a>
							</li>
							<li>
								<a href="#" className="transition-colors hover:text-white">
									Enfoque y RSE
								</a>
							</li>
							<li>
								<a href="#" className="transition-colors hover:text-white">
									Nuestros aliados
								</a>
							</li>
						</ul>
					</div>

					<div>
						<h4 className="mb-4 font-semibold text-lg">Servicios</h4>
						<ul className="space-y-2 text-gray-400">
							<li>
								<a href="#" className="transition-colors hover:text-white">
									Prensa
								</a>
							</li>
							<li>
								<a href="#" className="transition-colors hover:text-white">
									¿Quieres una franquicia?
								</a>
							</li>
							<li>
								<a href="#" className="transition-colors hover:text-white">
									Trabaja con nosotros
								</a>
							</li>
						</ul>
					</div>

					<div>
						<h4 className="mb-4 font-semibold text-lg">Contacto</h4>
						<div className="space-y-4">
							<div className="flex items-center space-x-3">
								<MessageCircle className="h-5 w-5 text-green-500" />
								<div>
									<p className="text-gray-400 text-sm">WhatsApp</p>
									<p className="text-white">+54 11 5555 5555</p>
								</div>
							</div>

							<div className="flex items-center space-x-3">
								<Phone className="h-5 w-5 text-blue-500" />
								<div>
									<p className="text-gray-400 text-sm">Teléfono</p>
									<p className="text-white">+54 11 4444 4444</p>
								</div>
							</div>

							<div className="flex items-center space-x-3">
								<Mail className="h-5 w-5 text-purple-500" />
								<div>
									<p className="text-gray-400 text-sm">Email</p>
									<p className="text-white">hola@bulkbuy.com</p>
								</div>
							</div>
						</div>
					</div>
				</div>

				<div className="mt-12 border-gray-800 border-t pt-8 text-center">
					<p className="text-gray-400">
						© 2024 BulkBuy. Todos los derechos reservados. Hecho con ❤️ para la
						comunidad.
					</p>
				</div>
			</div>
		</footer>
	);
}
