"use client";

import { Product, Supplier } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { formatCurrency } from "@/lib/utils";
import { Minus, Plus, ShoppingCart, Truck } from "lucide-react";
import Image from "next/image";
import { useState } from "react";

interface ProductDetailProps {
  product: Product & { supplier: Supplier };
  onAddToCart?: (product: Product, quantity: number) => void;
}

export function ProductDetail({ product, onAddToCart }: ProductDetailProps) {
  const [quantity, setQuantity] = useState(product.customerMoq);

  const handleQuantityChange = (delta: number) => {
    const newQuantity = quantity + delta;
    if (newQuantity >= product.customerMoq) {
      setQuantity(newQuantity);
    }
  };

  const images = product.images && product.images.length > 0 
    ? product.images 
    : ["/placeholder-image.jpg"];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 p-6 max-w-6xl mx-auto">
      {/* Image Gallery */}
      <div className="w-full">
        <Carousel className="w-full max-w-md mx-auto">
          <CarouselContent>
            {images.map((img, index) => (
              <CarouselItem key={index}>
                <div className="relative aspect-square w-full overflow-hidden rounded-lg border bg-gray-100">
                  <Image
                    src={img}
                    alt={`${product.name} - Image ${index + 1}`}
                    fill
                    className="object-cover"
                  />
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
          {images.length > 1 && (
            <>
              <CarouselPrevious />
              <CarouselNext />
            </>
          )}
        </Carousel>
      </div>

      {/* Product Info */}
      <div className="flex flex-col gap-6">
        <div>
          <div className="flex flex-wrap gap-2 mb-2">
            {product.tags.map(tag => (
              <Badge key={tag} variant="secondary">{tag}</Badge>
            ))}
            {!product.isActive && <Badge variant="destructive">Unavailable</Badge>}
          </div>
          <h1 className="text-3xl font-bold text-gray-900">{product.name}</h1>
          <p className="text-sm text-muted-foreground mt-1">Code: {product.code}</p>
        </div>

        <div className="flex items-end gap-2">
          <span className="text-3xl font-bold text-primary">{formatCurrency(product.price)}</span>
          <span className="text-lg text-muted-foreground">/ {product.priceUnit}</span>
        </div>

        <div className="prose prose-sm text-gray-600">
          <p>{product.description}</p>
        </div>

        <Separator />

        <div className="space-y-4">
            <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Supplier</span>
                <span className="font-medium">{product.supplier.name}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Min. Order</span>
                <span className="font-medium">{product.customerMoq} {product.customerUnit}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Delivery</span>
                <span className="font-medium flex items-center gap-1"><Truck className="h-4 w-4" /> Calculated at checkout</span>
            </div>
        </div>

        <Separator />

        <div className="flex flex-col gap-4">
            <div className="flex items-center gap-4">
                <span className="font-medium">Quantity ({product.customerUnit}):</span>
                <div className="flex items-center border rounded-md">
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-10 w-10 rounded-none"
                        onClick={() => handleQuantityChange(-1)}
                        disabled={quantity <= product.customerMoq}
                    >
                        <Minus className="h-4 w-4" />
                    </Button>
                    <div className="w-16 text-center font-medium">
                        {quantity}
                    </div>
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-10 w-10 rounded-none"
                        onClick={() => handleQuantityChange(1)}
                    >
                        <Plus className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            <Button 
                size="lg" 
                className="w-full gap-2 text-lg"
                onClick={() => onAddToCart?.(product, quantity)}
                disabled={!product.isActive}
            >
                <ShoppingCart className="h-5 w-5" />
                Add to Cart - {formatCurrency(product.price * quantity)}
            </Button>
        </div>
      </div>
    </div>
  );
}
