"use client";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { ShoppingCart } from "lucide-react";
import { CartItem, CartItemWithProduct } from "./cart-item";
import { formatCurrency } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useState } from "react";

interface CartSheetProps {
  items: CartItemWithProduct[];
  onUpdateQuantity?: (id: string, quantity: number) => void;
  onRemoveItem?: (id: string) => void;
  onCheckout?: () => void;
}

export function CartSheet({ items, onUpdateQuantity, onRemoveItem, onCheckout }: CartSheetProps) {
  const [isOpen, setIsOpen] = useState(false);

  const total = items.reduce((acc, item) => {
    return acc + (item.product.price * item.quantity);
  }, 0);

  const itemCount = items.length;

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="icon" className="relative">
          <ShoppingCart className="h-5 w-5" />
          {itemCount > 0 && (
            <span className="absolute -top-2 -right-2 bg-primary text-primary-foreground text-[10px] font-bold rounded-full h-5 w-5 flex items-center justify-center">
              {itemCount}
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md flex flex-col">
        <SheetHeader>
          <SheetTitle>Your Cart ({itemCount})</SheetTitle>
        </SheetHeader>
        
        <div className="flex-1 overflow-hidden mt-4">
            {items.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
                    <ShoppingCart className="h-12 w-12 mb-4 opacity-20" />
                    <p>Your cart is empty</p>
                    <Button variant="link" onClick={() => setIsOpen(false)}>
                        Continue Shopping
                    </Button>
                </div>
            ) : (
                <ScrollArea className="h-full pr-4">
                    <div className="flex flex-col divide-y">
                        {items.map((item) => (
                            <CartItem 
                                key={item.id} 
                                item={item} 
                                onUpdateQuantity={onUpdateQuantity}
                                onRemove={onRemoveItem}
                            />
                        ))}
                    </div>
                </ScrollArea>
            )}
        </div>

        {items.length > 0 && (
            <div className="mt-auto pt-4">
                <Separator className="mb-4" />
                <div className="flex items-center justify-between mb-4">
                    <span className="font-medium">Total</span>
                    <span className="font-bold text-xl">{formatCurrency(total)}</span>
                </div>
                <SheetFooter>
                    <Button className="w-full" size="lg" onClick={onCheckout}>
                        Checkout
                    </Button>
                </SheetFooter>
            </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
