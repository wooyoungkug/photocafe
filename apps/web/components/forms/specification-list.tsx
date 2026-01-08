'use client';

import { useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/dialog';
import { useProductSpecifications, useDeleteSpecification, ProductSpecification } from '@/hooks/use-specifications';
import { SpecificationFormDialog } from './specification-form-dialog';

interface SpecificationListProps {
  productId: string;
}

export function SpecificationList({ productId }: SpecificationListProps) {
  const [formOpen, setFormOpen] = useState(false);
  const [selectedSpec, setSelectedSpec] = useState<ProductSpecification | undefined>();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ProductSpecification | null>(null);

  const { data: specifications, isLoading } = useProductSpecifications(productId);
  const deleteSpecification = useDeleteSpecification();

  const handleAddClick = () => {
    setSelectedSpec(undefined);
    setFormOpen(true);
  };

  const handleEditClick = (spec: ProductSpecification) => {
    setSelectedSpec(spec);
    setFormOpen(true);
  };

  const handleDeleteClick = (spec: ProductSpecification) => {
    setDeleteTarget(spec);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;

    try {
      await deleteSpecification.mutateAsync({
        productId,
        specId: deleteTarget.id,
      });
      setDeleteDialogOpen(false);
      setDeleteTarget(null);
    } catch (error) {
      console.error('규격 삭제 실패:', error);
    }
  };

  if (isLoading) {
    return <div className="text-center py-8">로딩 중...</div>;
  }

  return (
    <>
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold">규격 목록</h3>
          <Button onClick={handleAddClick} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            규격 추가
          </Button>
        </div>

        {!specifications || specifications.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            등록된 규격이 없습니다.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>규격명</TableHead>
                <TableHead>가로 × 세로</TableHead>
                <TableHead>단위</TableHead>
                <TableHead className="w-24">작업</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {specifications.map((spec) => (
                <TableRow key={spec.id}>
                  <TableCell className="font-medium">{spec.name}</TableCell>
                  <TableCell>
                    {spec.width} × {spec.height}
                  </TableCell>
                  <TableCell>{spec.unit}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditClick(spec)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteClick(spec)}
                      >
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <SpecificationFormDialog
        productId={productId}
        specification={selectedSpec}
        open={formOpen}
        onOpenChange={setFormOpen}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>규격 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              "{deleteTarget?.name}" 규격을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-2 justify-end">
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={deleteSpecification.isPending}
            >
              {deleteSpecification.isPending ? '삭제 중...' : '삭제'}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
