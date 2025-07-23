"use client";

import {
	Building2,
	CheckCircle,
	Clock,
	CreditCard,
	Shield,
	Users,
	Wallet,
} from "lucide-react";
import { useState } from "react";
import { Badge } from "~/ui/badge";
import { Button } from "~/ui/button";
import { Card, CardContent } from "~/ui/card";
import { Checkbox } from "~/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "~/ui/dialog";
import { Input } from "~/ui/input";
import { Label } from "~/ui/label";
import { RadioGroup, RadioGroupItem } from "~/ui/radio-group";
import { Separator } from "~/ui/separator";

interface PaymentModalProps {
	isOpen?: boolean;
	onClose?: () => void;
	product?: {
		name: string;
		price: number;
		groupPrice: number;
		currentParticipants: number;
		minQuantity: number;
		timeLeft: string;
	};
}

export default function PaymentModal({
	isOpen = false,
	onClose = () => {},
	product = {
		name: "Aceite de Oliva Premium",
		price: 45.99,
		groupPrice: 32.99,
		currentParticipants: 15,
		minQuantity: 20,
		timeLeft: "2 días",
	},
}: PaymentModalProps) {
	const [paymentMethod, setPaymentMethod] = useState("card");
	const [paymentStep, setPaymentStep] = useState("method"); // method, details, confirmation
	const [quantity, setQuantity] = useState(1);
	const [agreedToTerms, setAgreedToTerms] = useState(false);

	const totalAmount = product.groupPrice * quantity;
	const savings = (product.price - product.groupPrice) * quantity;

	const handlePayment = () => {
		setPaymentStep("confirmation");
		// Simulate payment processing
		setTimeout(() => {
			setPaymentStep("success");
		}, 2000);
	};

	const renderPaymentMethod = () => (
		<div className="space-y-6">
			<div>
				<h3 className="mb-4 font-semibold text-lg">
					Selecciona tu método de pago
				</h3>
				<RadioGroup value={paymentMethod} onValueChange={setPaymentMethod}>
					<div className="space-y-3">
						<div className="flex items-center space-x-3 rounded-lg border p-4 hover:bg-gray-50">
							<RadioGroupItem value="card" id="card" />
							<CreditCard className="h-5 w-5 text-blue-500" />
							<Label htmlFor="card" className="flex-1 cursor-pointer">
								Tarjeta de crédito/débito
							</Label>
							<div className="flex space-x-2">
								<div className="flex h-5 w-8 items-center justify-center rounded bg-blue-600 text-white text-xs">
									VISA
								</div>
								<div className="flex h-5 w-8 items-center justify-center rounded bg-red-600 text-white text-xs">
									MC
								</div>
							</div>
						</div>

						<div className="flex items-center space-x-3 rounded-lg border p-4 hover:bg-gray-50">
							<RadioGroupItem value="wallet" id="wallet" />
							<Wallet className="h-5 w-5 text-green-500" />
							<Label htmlFor="wallet" className="flex-1 cursor-pointer">
								Billetera digital
							</Label>
							<Badge variant="secondary">MercadoPago</Badge>
						</div>

						<div className="flex items-center space-x-3 rounded-lg border p-4 hover:bg-gray-50">
							<RadioGroupItem value="transfer" id="transfer" />
							<Building2 className="h-5 w-5 text-purple-500" />
							<Label htmlFor="transfer" className="flex-1 cursor-pointer">
								Transferencia bancaria
							</Label>
							<Badge variant="outline">Sin comisión</Badge>
						</div>
					</div>
				</RadioGroup>
			</div>

			<Card className="border-blue-200 bg-gradient-to-r from-blue-50 to-purple-50">
				<CardContent className="p-4">
					<div className="flex items-center space-x-3">
						<Shield className="h-5 w-5 text-blue-500" />
						<div>
							<p className="font-medium text-blue-800">
								Pago seguro garantizado
							</p>
							<p className="text-blue-600 text-sm">
								Tus datos están protegidos con encriptación SSL
							</p>
						</div>
					</div>
				</CardContent>
			</Card>

			<Button
				onClick={() => setPaymentStep("details")}
				className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
				size="lg"
			>
				Continuar con el pago
			</Button>
		</div>
	);

	const renderPaymentDetails = () => (
		<div className="space-y-6">
			<div>
				<h3 className="mb-4 font-semibold text-lg">Detalles de pago</h3>

				{paymentMethod === "card" && (
					<div className="space-y-4">
						<div>
							<Label htmlFor="cardNumber">Número de tarjeta</Label>
							<Input id="cardNumber" placeholder="1234 5678 9012 3456" />
						</div>
						<div className="grid grid-cols-2 gap-4">
							<div>
								<Label htmlFor="expiry">Vencimiento</Label>
								<Input id="expiry" placeholder="MM/AA" />
							</div>
							<div>
								<Label htmlFor="cvv">CVV</Label>
								<Input id="cvv" placeholder="123" />
							</div>
						</div>
						<div>
							<Label htmlFor="cardName">Nombre en la tarjeta</Label>
							<Input id="cardName" placeholder="Juan Pérez" />
						</div>
					</div>
				)}

				{paymentMethod === "wallet" && (
					<div className="py-8 text-center">
						<Wallet className="mx-auto mb-4 h-16 w-16 text-green-500" />
						<p className="mb-2 font-medium text-lg">
							Serás redirigido a MercadoPago
						</p>
						<p className="text-gray-600">
							Completa tu pago de forma segura en la plataforma
						</p>
					</div>
				)}

				{paymentMethod === "transfer" && (
					<div className="space-y-4">
						<div className="rounded-lg bg-gray-50 p-4">
							<p className="mb-2 font-medium">Datos para transferencia:</p>
							<p className="text-gray-600 text-sm">Banco: Banco Nación</p>
							<p className="text-gray-600 text-sm">
								CBU: 0110599520000012345678
							</p>
							<p className="text-gray-600 text-sm">Alias: BULKBUY.PAGOS</p>
						</div>
						<div>
							<Label htmlFor="transferRef">Número de referencia</Label>
							<Input
								id="transferRef"
								placeholder="Ingresa el número de transferencia"
							/>
						</div>
					</div>
				)}
			</div>

			<div className="flex items-center space-x-2">
				<Checkbox
					id="terms"
					checked={agreedToTerms}
					onCheckedChange={(checked) => setAgreedToTerms(checked === true)}
				/>
				<Label htmlFor="terms" className="text-sm">
					Acepto los términos y condiciones y la política de privacidad
				</Label>
			</div>

			<div className="flex space-x-3">
				<Button
					variant="outline"
					onClick={() => setPaymentStep("method")}
					className="flex-1"
				>
					Volver
				</Button>
				<Button
					onClick={handlePayment}
					disabled={!agreedToTerms}
					className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
				>
					Confirmar pago
				</Button>
			</div>
		</div>
	);

	const renderConfirmation = () => (
		<div className="py-8 text-center">
			<div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-purple-500 border-t-transparent" />
			<h3 className="mb-2 font-semibold text-lg">Procesando tu pago...</h3>
			<p className="text-gray-600">
				Por favor espera mientras confirmamos tu participación en el grupo
			</p>
		</div>
	);

	const renderSuccess = () => (
		<div className="py-8 text-center">
			<CheckCircle className="mx-auto mb-4 h-16 w-16 text-green-500" />
			<h3 className="mb-2 font-semibold text-green-600 text-xl">
				¡Pago exitoso!
			</h3>
			<p className="mb-6 text-gray-600">
				Te has unido al grupo de compra exitosamente
			</p>

			<Card className="mb-6 border-green-200 bg-green-50">
				<CardContent className="p-4">
					<div className="mb-2 flex items-center justify-between">
						<span className="font-medium">Estado del grupo:</span>
						<Badge className="bg-green-500">
							{product.currentParticipants + 1}/{product.minQuantity}
						</Badge>
					</div>
					<div className="h-2 w-full rounded-full bg-green-200">
						<div
							className="h-2 rounded-full bg-green-500 transition-all duration-300"
							style={{
								width: `${((product.currentParticipants + 1) / product.minQuantity) * 100}%`,
							}}
						/>
					</div>
					<p className="mt-2 text-green-600 text-sm">
						{product.minQuantity - (product.currentParticipants + 1)} personas
						más para activar el descuento
					</p>
				</CardContent>
			</Card>

			<Button
				onClick={onClose}
				className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
			>
				Continuar comprando
			</Button>
		</div>
	);

	return (
		<Dialog open={isOpen} onOpenChange={onClose}>
			<DialogContent className="max-h-[90vh] max-w-md overflow-y-auto">
				<DialogHeader>
					<DialogTitle className="text-center">
						{paymentStep === "success"
							? "¡Bienvenido al grupo!"
							: "Unirse al grupo de compra"}
					</DialogTitle>
				</DialogHeader>

				{paymentStep !== "success" && (
					<Card className="mb-6">
						<CardContent className="p-4">
							<div className="mb-3 flex items-center space-x-3">
								<div className="h-12 w-12 rounded-lg bg-gray-200" />
								<div className="flex-1">
									<h4 className="font-medium">{product.name}</h4>
									<div className="flex items-center space-x-2">
										<span className="font-bold text-green-600 text-lg">
											${product.groupPrice}
										</span>
										<span className="text-gray-500 text-sm line-through">
											${product.price}
										</span>
									</div>
								</div>
							</div>

							<Separator className="my-3" />

							<div className="space-y-2">
								<div className="flex justify-between">
									<span>Cantidad:</span>
									<div className="flex items-center space-x-2">
										<Button
											size="sm"
											variant="outline"
											onClick={() => setQuantity(Math.max(1, quantity - 1))}
										>
											-
										</Button>
										<span className="w-8 text-center">{quantity}</span>
										<Button
											size="sm"
											variant="outline"
											onClick={() => setQuantity(quantity + 1)}
										>
											+
										</Button>
									</div>
								</div>
								<div className="flex justify-between">
									<span>Subtotal:</span>
									<span className="font-medium">${totalAmount.toFixed(2)}</span>
								</div>
								<div className="flex justify-between text-green-600">
									<span>Ahorras:</span>
									<span className="font-medium">${savings.toFixed(2)}</span>
								</div>
							</div>

							<Separator className="my-3" />

							<div className="flex items-center justify-between text-sm">
								<div className="flex items-center space-x-2">
									<Users className="h-4 w-4 text-purple-500" />
									<span>
										{product.currentParticipants}/{product.minQuantity} unidos
									</span>
								</div>
								<div className="flex items-center space-x-2">
									<Clock className="h-4 w-4 text-orange-500" />
									<span>{product.timeLeft}</span>
								</div>
							</div>
						</CardContent>
					</Card>
				)}

				{paymentStep === "method" && renderPaymentMethod()}
				{paymentStep === "details" && renderPaymentDetails()}
				{paymentStep === "confirmation" && renderConfirmation()}
				{paymentStep === "success" && renderSuccess()}
			</DialogContent>
		</Dialog>
	);
}
