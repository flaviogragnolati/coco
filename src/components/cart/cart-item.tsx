"use client";

import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import { Product } from "@prisma/client";
import { Minus, Plus, Trash2 } from "lucide-react";
import Image from "next/image";

// Extended type to include product details
export interface CartItemWithProduct {
  id: string;
  productId: number;
  quantity: number;
  product: Product;
}

interface CartItemProps {
  item: CartItemWithProduct;
  onUpdateQuantity?: (id: string, quantity: number) => void;
  onRemove?: (id: string) => void;
}

export function CartItem({ item, onUpdateQuantity, onRemove }: CartItemProps) {
  const { product, quantity } = item;
  
  const imageUrl = product.images && product.images.length > 0 
    ? product.images[0] 
    : "/placeholder-image.jpg";

  return (
    <div className="flex gap-4 py-4">
      <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-md border bg-gray-100">
        <Image
          src={imageUrl}
          alt={product.name}
          fill
          className="object-cover"
        />
      </div>

      <div className="flex flex-1 flex-col justify-between">
        <div className="flex justify-between gap-2">
          <h3 className="font-medium text-sm line-clamp-2" title={product.name}>
            {product.name}
          </h3>
          <p className="font-semibold text-sm">
            {formatCurrency(product.price * quantity)}
          </p>
        </div>
        
        <div className="flex items-center justify-between mt-2">
            <div className="text-xs text-muted-foreground">
                {formatCurrency(product.price)} / {product.priceUnit}
            </div>
            
            <div className="flex items-center gap-2">
                <div className="flex items-center border rounded-md h-8">
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 rounded-none"
                        onClick={() => onUpdateQuantity?.(item.id, quantity - 1)}
                        disabled={quantity <= product.customerMoq}
                    >
                        <Minus className="h-3 w-3" />
                    </Button>
                    <div className="w-8 text-center text-sm font-medium">
                        {quantity}
                    </div>
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 rounded-none"
                        onClick={() => onUpdateQuantity?.(item.id, quantity + 1)}
                    >
                        <Plus className="h-3 w-3" />
                    </Button>
                </div>
                
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => onRemove?.(item.id)}
                >
                    <Trash2 className="h-4 w-4" />
                </Button>
            </div>
        </div>
      </div>
    </div>
  );
}
