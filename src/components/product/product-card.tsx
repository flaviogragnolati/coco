import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Product } from "@prisma/client";
import Image from "next/image";
import { formatCurrency } from "@/lib/utils";
import { ShoppingCart } from "lucide-react";

interface ProductCardProps {
  product: Product;
  onAddToCart?: (product: Product) => void;
}

export function ProductCard({ product, onAddToCart }: ProductCardProps) {
  // Fallback image if product.images is empty or null
  const imageUrl = product.images && product.images.length > 0 ? product.images[0] : "/placeholder-image.jpg";

  return (
    <Card className="w-full max-w-sm overflow-hidden hover:shadow-lg transition-shadow duration-300 flex flex-col h-full">
      <div className="relative h-48 w-full bg-gray-100">
        <Image
          src={imageUrl}
          alt={product.name}
          fill
          className="object-cover"
        />
        {product.tags && product.tags.length > 0 && (
            <div className="absolute top-2 right-2 flex gap-1">
                {product.tags.map(tag => (
                    <Badge key={tag} variant="secondary" className="text-xs bg-white/80 hover:bg-white/90 backdrop-blur-sm">
                        {tag}
                    </Badge>
                ))}
            </div>
        )}
      </div>
      
      <CardHeader className="p-4 pb-0">
        <div className="flex justify-between items-start">
            <div>
                <h3 className="font-semibold text-lg line-clamp-1" title={product.name}>{product.name}</h3>
                <p className="text-sm text-muted-foreground line-clamp-2 mt-1 h-10" title={product.description || ""}>
                {product.description}
                </p>
            </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-4 pt-2 flex-grow">
        <div className="flex items-baseline gap-1 mt-2">
            <span className="text-xl font-bold text-primary">
                {formatCurrency(product.price)}
            </span>
            <span className="text-sm text-muted-foreground">
                / {product.priceUnit}
            </span>
        </div>
        
        <div className="mt-2 text-xs text-muted-foreground">
            <p>Min. Order: {product.customerMoq} {product.customerUnit}</p>
        </div>
      </CardContent>
      
      <CardFooter className="p-4 pt-0 mt-auto">
        <Button 
            className="w-full gap-2" 
            onClick={() => onAddToCart?.(product)}
            disabled={!product.isActive}
        >
            <ShoppingCart className="h-4 w-4" />
            {product.isActive ? "Add to Cart" : "Unavailable"}
        </Button>
      </CardFooter>
    </Card>
  );
}
