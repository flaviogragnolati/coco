import Link from "next/link";

import { Menu, Search, ShoppingCart, User } from "lucide-react";
import { Button } from "~/ui/button";
import { Input } from "~/ui/input";

export default function Header() {
  return (
    <header className="border-gradient-to-r border-b-4 bg-white from-purple-500 to-pink-500 shadow-lg">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-8">
            <h1 className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text font-bold text-2xl text-transparent">
              BulkBuy
            </h1>
            <nav className="hidden items-center space-x-6 md:flex">
              <Link
                href="/dashboard"
                className="font-medium text-gray-700 hover:text-purple-600"
              >
                Dashboard
              </Link>
              <Link
                href="/carritos"
                className="font-medium text-gray-700 hover:text-purple-600"
              >
                Carritos
              </Link>
              <Link
                href="/lotes"
                className="font-medium text-gray-700 hover:text-purple-600"
              >
                Lotes
              </Link>
              <Link
                href="/paquetes"
                className="font-medium text-gray-700 hover:text-purple-600"
              >
                Paquetes
              </Link>
              <Link
                href="/envios"
                className="font-medium text-gray-700 hover:text-purple-600"
              >
                Envíos
              </Link>
            </nav>
          </div>

          <div className="mx-8 max-w-md flex-1">
            <div className="relative">
              <Search className="-translate-y-1/2 absolute top-1/2 left-3 h-4 w-4 transform text-gray-400" />
              <Input
                placeholder="¿Qué estás buscando?..."
                className="border-2 border-purple-200 pl-10 focus:border-purple-500"
              />
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <Button
              variant="outline"
              size="sm"
              className="hidden border-purple-200 bg-transparent text-purple-600 hover:bg-purple-50 md:flex"
            >
              <User className="mr-2 h-4 w-4" />
              Ingresar
            </Button>
            <Button
              size="sm"
              className="hidden bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 md:flex"
            >
              Crear cuenta
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="border-purple-200 bg-transparent text-purple-600 hover:bg-purple-50"
            >
              <ShoppingCart className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="border-purple-200 bg-transparent text-purple-600 md:hidden"
            >
              <Menu className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
