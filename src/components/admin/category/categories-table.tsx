"use client";

import { useCallback, useMemo, useState } from "react";
import { Edit, Plus, Tag, Trash, Images } from "lucide-react";

import type { RouterOutputs } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Badge } from "~/components/ui/badge";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "~/components/ui/avatar";
import {
  AppTable,
  type ColumnConfig,
} from "~/components/ui/app-table";
import { useConfirm } from "~/components/ui/confirm";
import { CategoryForm } from "./category-form";
import { api } from "~/trpc/react";

type CategoryRecord = RouterOutputs["categories"]["getAllCategories"][number];

interface CategoriesTableProps {
  categories: CategoryRecord[];
  isLoading?: boolean;
}

const normalizeTags = (tags?: string[] | null) =>
  (tags ?? []).map((tag) => tag.trim()).filter(Boolean);

const getInitials = (name: string) => {
  return name
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase())
    .join("")
    .slice(0, 2);
};

export function CategoriesTable({
  categories,
  isLoading = false,
}: CategoriesTableProps) {
  const confirm = useConfirm();
  const utils = api.useUtils();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CategoryRecord | null>(
    null,
  );

  const createMutation = api.categories.createCategory.useMutation({
    async onSuccess() {
      await utils.categories.getAllCategories.invalidate();
      setIsModalOpen(false);
    },
  });

  const updateMutation = api.categories.updateCategory.useMutation({
    async onSuccess() {
      await utils.categories.getAllCategories.invalidate();
      setIsModalOpen(false);
      setEditingCategory(null);
    },
  });

  const deleteMutation = api.categories.deleteCategory.useMutation({
    async onSuccess() {
      await utils.categories.getAllCategories.invalidate();
    },
  });

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  const handleCreate = () => {
    setEditingCategory(null);
    setIsModalOpen(true);
  };

  const handleEdit = useCallback((category: CategoryRecord) => {
    setEditingCategory(category);
    setIsModalOpen(true);
  }, []);

  const handleDelete = useCallback(
    async (category: CategoryRecord) => {
      const result = await confirm({
        title: "Eliminar categoría",
        description: `¿Seguro que deseas eliminar "${category.name}"?`,
        confirmationText: "Eliminar",
        cancellationText: "Cancelar",
      });

      if (!result.confirmed) return;

      try {
        await deleteMutation.mutateAsync({ id: category.id });
      } catch (error) {
        console.error("Error deleting category", error);
      }
    },
    [confirm, deleteMutation],
  );

  const handleModalClose = () => {
    if (isSubmitting) return;
    setIsModalOpen(false);
    setEditingCategory(null);
  };

  const columns = useMemo<ColumnConfig<CategoryRecord>[]>(() => {
    return [
      {
        key: "category",
        title: "Categoría",
        type: "custom",
        render: (category) => (
          <div className="flex items-center gap-3">
            <Avatar>
              <AvatarImage src={category.image ?? undefined} alt={category.name} />
              <AvatarFallback>{getInitials(category.name)}</AvatarFallback>
            </Avatar>
            <div>
              <div className="font-medium">{category.name}</div>
              {category.description ? (
                <div className="text-muted-foreground text-sm">
                  {category.description}
                </div>
              ) : null}
            </div>
          </div>
        ),
      },
      {
        key: "tags",
        title: "Tags",
        type: "custom",
        render: (category) => {
          const tags = normalizeTags(category.tags);
          if (tags.length === 0) {
            return <span className="text-muted-foreground text-sm">Sin tags</span>;
          }
          return (
            <div className="flex flex-wrap gap-1">
              {tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="gap-1">
                  <Tag className="h-3 w-3" />
                  {tag}
                </Badge>
              ))}
            </div>
          );
        },
      },
      {
        key: "products",
        title: "Productos",
        type: "custom",
        render: (category) => (
          <div className="flex items-center gap-2 text-sm">
            <Images className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">{category._count?.products ?? 0}</span>
          </div>
        ),
      },
      {
        key: "status",
        title: "Estado",
        type: "custom",
        render: (category) => (
          <Badge variant={category.isActive ? "secondary" : "outline"}>
            {category.isActive ? "Activa" : "Inactiva"}
          </Badge>
        ),
      },
      {
        key: "updatedAt",
        title: "Actualizado",
        type: "date",
        dataKey: "updatedAt",
        dateFormat: "DD/MM/YYYY",
      },
      {
        key: "actions",
        title: "Acciones",
        type: "actions",
        actions: {
          layout: "inline",
          edit: {
            onClick: (category) => handleEdit(category),
            label: "Editar",
            icon: <Edit className="h-4 w-4" />,
          },
          delete: {
            onClick: (category) => handleDelete(category),
            label: "Eliminar",
            icon: <Trash className="h-4 w-4" />,
          },
        },
      },
    ];
  }, [handleDelete, handleEdit]);

  const emptyState = (
    <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
      <p className="text-muted-foreground">Aún no hay categorías registradas.</p>
      <Button variant="outline" onClick={handleCreate}>
        Crear la primera categoría
      </Button>
    </div>
  );

  const modalDefaultValues = editingCategory
    ? {
        name: editingCategory.name,
        description: editingCategory.description ?? null,
        image: editingCategory.image ?? null,
        tags: normalizeTags(editingCategory.tags),
        isActive: editingCategory.isActive,
      }
    : undefined;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-lg">
            Categorías ({categories.length})
          </h3>
          <p className="text-muted-foreground text-sm">
            Gestiona las categorías utilizadas en el catálogo.
          </p>
        </div>
        <Button onClick={handleCreate} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Nueva categoría
        </Button>
      </div>

      <Card className="overflow-hidden">
        <AppTable
          columns={columns}
          data={categories}
          loading={isLoading}
          emptyState={emptyState}
          emptyMessage="No hay categorías disponibles"
        />
      </Card>

      <Dialog open={isModalOpen} onOpenChange={(open) => (open ? setIsModalOpen(true) : handleModalClose())}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingCategory ? "Editar categoría" : "Crear categoría"}
            </DialogTitle>
            <DialogDescription>
              Completa los datos de la categoría.
            </DialogDescription>
          </DialogHeader>

          <CategoryForm
            defaultValues={modalDefaultValues}
            onSubmit={async (formValues) => {
              try {
                if (editingCategory) {
                  await updateMutation.mutateAsync({
                    id: editingCategory.id,
                    ...formValues,
                  });
                } else {
                  await createMutation.mutateAsync(formValues);
                }
              } catch (error) {
                console.error("Error saving category", error);
              }
            }}
            onCancel={handleModalClose}
            isSubmitting={isSubmitting}
            submitLabel={editingCategory ? "Guardar cambios" : "Crear categoría"}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
