"use client";

import { ProductCard } from "@/components/product/product-card";
import { ProductDetail } from "@/components/product/product-detail";
import { CartSheet } from "@/components/cart/cart-sheet";
import { Product, Supplier, CartItem } from "@prisma/client";
import { useState } from "react";
import { CartItemWithProduct } from "@/components/cart/cart-item";

// Mock Data
const mockSupplier: Supplier = {
  id: 1,
  name: "Best Supplier Inc.",
  description: "Quality goods",
  image: null,
  phone: "123-456-7890",
  email: "contact@bestsupplier.com",
  website: "https://bestsupplier.com",
  taxId: "123456789",
  taxType: "EIN",
  isActive: true,
  deleted: false,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockProduct: Product & { supplier: Supplier } = {
  id: 1,
  version: 1,
  name: "Premium Coffee Beans",
  description: "High quality Arabica beans, roasted to perfection. Great for espresso and filter coffee.",
  tags: ["Coffee", "Organic", "Fair Trade"],
  code: "COF-001",
  supplierCode: "SUP-COF-001",
  supplierUrl: null,
  images: ["https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=800&q=80"],
  price: 15.99,
  priceUnit: "kg",
  supplierMoq: 100,
  supplierUnit: "kg",
  customerMoq: 5,
  customerUnit: "kg",
  minFractionPerUser: 1,
  moqByProvider: 10,
  isActive: true,
  deleted: false,
  createdAt: new Date(),
  updatedAt: new Date(),
  cartId: null,
  supplierId: 1,
  providerId: null,
  categoryId: null,
  supplier: mockSupplier,
};

const mockProduct2: Product & { supplier: Supplier } = {
  ...mockProduct,
  id: 2,
  name: "Organic Tea Leaves",
  code: "TEA-001",
  price: 25.50,
  images: ["https://images.unsplash.com/photo-1594631252845-29fc4cc8cde9?auto=format&fit=crop&w=800&q=80"],
};

export default function TestComponentsPage() {
  const [cartItems, setCartItems] = useState<CartItemWithProduct[]>([
    {
      id: "item-1",
      productId: 1,
      quantity: 10,
      product: mockProduct,
    }
  ]);

  const handleAddToCart = (product: Product, quantity: number = 1) => {
    console.log("Added to cart:", product.name, quantity);
    const existingItem = cartItems.find(item => item.productId === product.id);
    if (existingItem) {
        setCartItems(cartItems.map(item => 
            item.productId === product.id 
                ? { ...item, quantity: item.quantity + quantity }
                : item
        ));
    } else {
        setCartItems([...cartItems, {
            id: `item-${Date.now()}`,
            productId: product.id,
            quantity: quantity,
            product: product,
        }]);
    }
  };

  const handleUpdateQuantity = (id: string, quantity: number) => {
    setCartItems(cartItems.map(item => 
        item.id === id ? { ...item, quantity } : item
    ));
  };

  const handleRemoveItem = (id: string) => {
    setCartItems(cartItems.filter(item => item.id !== id));
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8 space-y-12">
      <div className="fixed top-4 right-4 z-50">
        <CartSheet 
            items={cartItems} 
            onUpdateQuantity={handleUpdateQuantity}
            onRemoveItem={handleRemoveItem}
            onCheckout={() => alert("Checkout clicked!")}
        />
      </div>

      <section>
        <h2 className="text-2xl font-bold mb-4">Product Card</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          <ProductCard product={mockProduct} onAddToCart={(p) => handleAddToCart(p, p.customerMoq)} />
          <ProductCard product={mockProduct2} onAddToCart={(p) => handleAddToCart(p, p.customerMoq)} />
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-bold mb-4">Product Detail</h2>
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <ProductDetail product={mockProduct} onAddToCart={handleAddToCart} />
        </div>
      </section>
    </div>
  );
}
