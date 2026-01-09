"use client";

import { useState } from "react";
import {
    Plus,
    Search,
    Edit2,
    Trash2,
    Check,
    X,
    Ruler,
    ArrowUpDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
    useBasicSpecifications,
    useCreateBasicSpecification,
    useUpdateBasicSpecification,
    useDeleteBasicSpecification,
} from "@/hooks/use-basic-specifications";
import { Specification, CreateSpecificationRequest } from "@/lib/types/specification";

export default function SpecificationsPage() {
    const { toast } = useToast();
    const [searchTerm, setSearchTerm] = useState("");
    const [filterIndigo, setFilterIndigo] = useState(false);
    const [filterInkjet, setFilterInkjet] = useState(false);
    const [filterAlbum, setFilterAlbum] = useState(false);
    const [filterFrame, setFilterFrame] = useState(false);
    const [filterBooklet, setFilterBooklet] = useState(false);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [editingSpec, setEditingSpec] = useState<Specification | null>(null);
    const [deletingSpec, setDeletingSpec] = useState<Specification | null>(null);

    // Form state
    const [formData, setFormData] = useState<CreateSpecificationRequest>({
        name: "",
        widthInch: 0,
        heightInch: 0,
        widthMm: 0,
        heightMm: 0,
        forIndigo: false,
        forInkjet: false,
        forAlbum: false,
        forFrame: false,
        forBooklet: false,
        squareMeters: undefined,
        description: "",
        sortOrder: 0,
    });

    // Queries and mutations
    const { data: rawSpecifications, isLoading } = useBasicSpecifications({
        search: searchTerm || undefined,
        forIndigo: filterIndigo || undefined,
        forInkjet: filterInkjet || undefined,
        forAlbum: filterAlbum || undefined,
        forFrame: filterFrame || undefined,
        forBooklet: filterBooklet || undefined,
    });

    // 쌍(pair)이 인접하도록 정렬: widthMm + heightMm (둘레 기반)으로 그룹화, 가로형 먼저
    const specifications = rawSpecifications
        ? [...rawSpecifications].sort((a, b) => {
            const sumA = Number(a.widthMm) + Number(a.heightMm);
            const sumB = Number(b.widthMm) + Number(b.heightMm);
            if (sumA !== sumB) return sumA - sumB; // 둘레 오름차순
            return Number(b.widthMm) - Number(a.widthMm); // 가로형 먼저 (widthMm 내림차순)
        })
        : [];

    const createMutation = useCreateBasicSpecification();
    const updateMutation = useUpdateBasicSpecification();
    const deleteMutation = useDeleteBasicSpecification();

    // Inch to mm 자동 변환
    const convertInchToMm = (inch: number) => Math.round(inch * 25.4 * 100) / 100;
    const convertMmToInch = (mm: number) => Math.round((mm / 25.4) * 10000) / 10000;
    // 평방미터 계산 (mm -> m²)
    const calculateSquareMeters = (widthMm: number, heightMm: number) =>
        Math.round((widthMm * heightMm) / 1000000 * 100) / 100;

    // 인디고 n-up 계산 (310x450mm 용지에 몇 장 들어가는지)
    const INDIGO_WIDTH = 310;
    const INDIGO_HEIGHT = 450;

    const calculateIndigoNup = (widthMm: number, heightMm: number): number => {
        if (widthMm <= 0 || heightMm <= 0) return 0;

        // 정방향 배치
        const cols1 = Math.floor(INDIGO_WIDTH / widthMm);
        const rows1 = Math.floor(INDIGO_HEIGHT / heightMm);
        const count1 = cols1 * rows1;

        // 90도 회전 배치
        const cols2 = Math.floor(INDIGO_WIDTH / heightMm);
        const rows2 = Math.floor(INDIGO_HEIGHT / widthMm);
        const count2 = cols2 * rows2;

        return Math.max(count1, count2);
    };

    const handleInchChange = (field: "widthInch" | "heightInch", value: number) => {
        const mmField = field === "widthInch" ? "widthMm" : "heightMm";
        const newMmValue = convertInchToMm(value);
        const newWidthMm = field === "widthInch" ? newMmValue : formData.widthMm;
        const newHeightMm = field === "heightInch" ? newMmValue : formData.heightMm;
        setFormData({
            ...formData,
            [field]: value,
            [mmField]: newMmValue,
            squareMeters: calculateSquareMeters(newWidthMm, newHeightMm),
        });
    };

    const handleMmChange = (field: "widthMm" | "heightMm", value: number) => {
        const inchField = field === "widthMm" ? "widthInch" : "heightInch";
        const newWidthMm = field === "widthMm" ? value : formData.widthMm;
        const newHeightMm = field === "heightMm" ? value : formData.heightMm;
        setFormData({
            ...formData,
            [field]: value,
            [inchField]: convertMmToInch(value),
            squareMeters: calculateSquareMeters(newWidthMm, newHeightMm),
        });
    };

    const resetForm = () => {
        setFormData({
            name: "",
            widthInch: 0,
            heightInch: 0,
            widthMm: 0,
            heightMm: 0,
            forIndigo: false,
            forInkjet: false,
            forAlbum: false,
            forFrame: false,
            forBooklet: false,
            squareMeters: undefined,
            description: "",
            sortOrder: 0,
        });
        setEditingSpec(null);
    };

    const openCreateModal = () => {
        resetForm();
        setIsModalOpen(true);
    };

    const openEditModal = (spec: Specification) => {
        setEditingSpec(spec);
        setFormData({
            name: spec.name,
            widthInch: Number(spec.widthInch),
            heightInch: Number(spec.heightInch),
            widthMm: Number(spec.widthMm),
            heightMm: Number(spec.heightMm),
            forIndigo: spec.forIndigo,
            forInkjet: spec.forInkjet,
            forAlbum: spec.forAlbum,
            forFrame: spec.forFrame,
            forBooklet: spec.forBooklet,
            squareMeters: spec.squareMeters ? Number(spec.squareMeters) : undefined,
            description: spec.description ?? "",
            sortOrder: spec.sortOrder,
        });
        setIsModalOpen(true);
    };

    const handleSubmit = async () => {
        if (!formData.name?.trim()) {
            toast({
                title: "오류",
                description: "규격명을 입력해주세요",
                variant: "destructive",
            });
            return;
        }

        // 중복 체크 - 규격명
        const duplicateByName = specifications?.find(
            (s) => s.name === formData.name?.trim() && s.id !== editingSpec?.id
        );
        if (duplicateByName) {
            toast({
                title: "중복 오류",
                description: `"${formData.name}" 규격명이 이미 존재합니다`,
                variant: "destructive",
            });
            return;
        }

        // 중복 체크 - 크기 (mm)
        const duplicateBySize = specifications?.find(
            (s) =>
                Number(s.widthMm) === formData.widthMm &&
                Number(s.heightMm) === formData.heightMm &&
                s.id !== editingSpec?.id
        );
        if (duplicateBySize) {
            toast({
                title: "중복 오류",
                description: `동일한 크기(${formData.widthMm}×${formData.heightMm}mm)의 규격이 이미 존재합니다 (${duplicateBySize.name})`,
                variant: "destructive",
            });
            return;
        }

        try {
            if (editingSpec) {
                await updateMutation.mutateAsync({
                    id: editingSpec.id,
                    data: formData,
                });
                toast({
                    title: "성공",
                    description: "규격이 수정되었습니다",
                });
            } else {
                await createMutation.mutateAsync(formData);
                toast({
                    title: "성공",
                    description: "규격이 등록되었습니다",
                });
            }
            setIsModalOpen(false);
            resetForm();
        } catch (error) {
            toast({
                title: "오류",
                description: error instanceof Error ? error.message : "오류가 발생했습니다",
                variant: "destructive",
            });
        }
    };

    const handleDelete = async () => {
        if (!deletingSpec) return;

        try {
            await deleteMutation.mutateAsync(deletingSpec.id);
            toast({
                title: "성공",
                description: "규격이 삭제되었습니다",
            });
            setIsDeleteDialogOpen(false);
            setDeletingSpec(null);
        } catch (error) {
            toast({
                title: "오류",
                description: error instanceof Error ? error.message : "삭제 중 오류가 발생했습니다",
                variant: "destructive",
            });
        }
    };

    const openDeleteDialog = (spec: Specification) => {
        setDeletingSpec(spec);
        setIsDeleteDialogOpen(true);
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <Ruler className="h-6 w-6 text-indigo-500" />
                        규격정보 관리
                    </h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        상품 등록 및 가격 관리에서 사용할 규격을 등록합니다
                    </p>
                </div>
                <Button onClick={openCreateModal} className="gap-2">
                    <Plus className="h-4 w-4" />
                    규격 등록
                </Button>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-4 p-4 bg-white dark:bg-slate-800 rounded-lg shadow">
                <div className="flex-1 min-w-[200px] max-w-md">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                            placeholder="규격명 검색..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10"
                        />
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 text-sm">
                        <Checkbox
                            checked={filterIndigo}
                            onCheckedChange={(checked) => setFilterIndigo(checked === true)}
                        />
                        인디고출력
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                        <Checkbox
                            checked={filterInkjet}
                            onCheckedChange={(checked) => setFilterInkjet(checked === true)}
                        />
                        잉크젯출력
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                        <Checkbox
                            checked={filterAlbum}
                            onCheckedChange={(checked) => setFilterAlbum(checked === true)}
                        />
                        앨범전용
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                        <Checkbox
                            checked={filterFrame}
                            onCheckedChange={(checked) => setFilterFrame(checked === true)}
                        />
                        액자전용
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                        <Checkbox
                            checked={filterBooklet}
                            onCheckedChange={(checked) => setFilterBooklet(checked === true)}
                        />
                        인쇄책자전용
                    </label>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[60px]">번호</TableHead>
                            <TableHead>규격명</TableHead>
                            <TableHead className="text-center w-[100px]">등록일</TableHead>
                            <TableHead className="text-center">가로×세로(mm)</TableHead>
                            <TableHead className="text-center">가로×세로(inch)</TableHead>
                            <TableHead className="text-center w-[80px]">평방m</TableHead>
                            <TableHead className="text-center w-[70px]">인디고</TableHead>
                            <TableHead className="text-center w-[70px]">잉크젯</TableHead>
                            <TableHead className="text-center w-[70px]">앨범전용</TableHead>
                            <TableHead className="text-center w-[70px]">액자전용</TableHead>
                            <TableHead className="text-center w-[70px]">인쇄책자</TableHead>
                            <TableHead className="text-center w-[100px]">관리</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow>
                                <TableCell colSpan={12} className="text-center py-8">
                                    로딩 중...
                                </TableCell>
                            </TableRow>
                        ) : specifications?.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={12} className="text-center py-8 text-gray-500">
                                    등록된 규격이 없습니다
                                </TableCell>
                            </TableRow>
                        ) : (
                            specifications?.map((spec, index) => (
                                <TableRow key={spec.id}>
                                    <TableCell className="text-center text-gray-500">
                                        {index + 1}
                                    </TableCell>
                                    <TableCell className="font-medium">{spec.name}</TableCell>
                                    <TableCell className="text-center text-sm text-gray-500">
                                        {new Date(spec.createdAt).toLocaleDateString('ko-KR')}
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <span className="flex items-center justify-center gap-1">
                                            {Number(spec.widthMm).toFixed(1)} × {Number(spec.heightMm).toFixed(1)}
                                            {Number(spec.heightMm) > Number(spec.widthMm) && (
                                                <span className="ml-1 text-xs px-1.5 py-0.5 bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 rounded">
                                                    세로형
                                                </span>
                                            )}
                                            {Number(spec.widthMm) > Number(spec.heightMm) && (
                                                <span className="ml-1 text-xs px-1.5 py-0.5 bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300 rounded">
                                                    가로형
                                                </span>
                                            )}
                                            {Number(spec.widthMm) === Number(spec.heightMm) && (
                                                <span className="ml-1 text-xs px-1.5 py-0.5 bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 rounded">
                                                    정방형
                                                </span>
                                            )}
                                        </span>
                                    </TableCell>
                                    <TableCell className="text-center">
                                        {parseFloat(Number(spec.widthInch).toFixed(2))} × {parseFloat(Number(spec.heightInch).toFixed(2))}
                                    </TableCell>
                                    <TableCell className="text-center">
                                        {spec.squareMeters ? Number(spec.squareMeters).toFixed(2) : "-"}
                                    </TableCell>
                                    <TableCell className="text-center">
                                        {spec.forIndigo ? (
                                            <div className="flex flex-col items-center">
                                                <Check className="h-4 w-4 text-green-500" />
                                                <span className="text-[10px] text-gray-500 mt-0.5">
                                                    {calculateIndigoNup(Number(spec.widthMm), Number(spec.heightMm))}up
                                                </span>
                                            </div>
                                        ) : (
                                            <X className="h-4 w-4 text-gray-300 mx-auto" />
                                        )}
                                    </TableCell>
                                    <TableCell className="text-center">
                                        {spec.forInkjet ? (
                                            <Check className="h-4 w-4 text-green-500 mx-auto" />
                                        ) : (
                                            <X className="h-4 w-4 text-gray-300 mx-auto" />
                                        )}
                                    </TableCell>
                                    <TableCell className="text-center">
                                        {spec.forAlbum ? (
                                            <Check className="h-4 w-4 text-green-500 mx-auto" />
                                        ) : (
                                            <X className="h-4 w-4 text-gray-300 mx-auto" />
                                        )}
                                    </TableCell>
                                    <TableCell className="text-center">
                                        {spec.forFrame ? (
                                            <Check className="h-4 w-4 text-green-500 mx-auto" />
                                        ) : (
                                            <X className="h-4 w-4 text-gray-300 mx-auto" />
                                        )}
                                    </TableCell>
                                    <TableCell className="text-center">
                                        {spec.forBooklet ? (
                                            <Check className="h-4 w-4 text-green-500 mx-auto" />
                                        ) : (
                                            <X className="h-4 w-4 text-gray-300 mx-auto" />
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center justify-center gap-1">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => openEditModal(spec)}
                                            >
                                                <Edit2 className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => openDeleteDialog(spec)}
                                                className="text-red-500 hover:text-red-700"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Create/Edit Modal */}
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>
                            {editingSpec ? "규격 수정" : "새 규격 등록"}
                        </DialogTitle>
                        <DialogDescription>
                            상품 등록 시 사용할 규격 정보를 입력합니다
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-4 py-4">
                        {/* 규격명 */}
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="name" className="text-right">
                                규격명 *
                            </Label>
                            <Input
                                id="name"
                                value={formData.name}
                                onChange={(e) =>
                                    setFormData({ ...formData, name: e.target.value })
                                }
                                className="col-span-3"
                                placeholder="예: 7x4.7, 22.5x30.5"
                            />
                        </div>

                        {/* 인치 크기 */}
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label className="text-right">크기 (inch)</Label>
                            <div className="col-span-3 flex items-center gap-2">
                                <Input
                                    type="number"
                                    step="0.01"
                                    value={formData.widthInch}
                                    onChange={(e) =>
                                        handleInchChange("widthInch", parseFloat(e.target.value) || 0)
                                    }
                                    className="w-24"
                                    placeholder="가로"
                                />
                                <span>×</span>
                                <Input
                                    type="number"
                                    step="0.01"
                                    value={formData.heightInch}
                                    onChange={(e) =>
                                        handleInchChange("heightInch", parseFloat(e.target.value) || 0)
                                    }
                                    className="w-24"
                                    placeholder="세로"
                                />
                                <span className="text-gray-500">inch</span>
                            </div>
                        </div>

                        {/* mm 크기 */}
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label className="text-right">크기 (mm)</Label>
                            <div className="col-span-3 flex items-center gap-2">
                                <Input
                                    type="number"
                                    step="0.1"
                                    value={formData.widthMm}
                                    onChange={(e) =>
                                        handleMmChange("widthMm", parseFloat(e.target.value) || 0)
                                    }
                                    className="w-24"
                                    placeholder="가로"
                                />
                                <span>×</span>
                                <Input
                                    type="number"
                                    step="0.1"
                                    value={formData.heightMm}
                                    onChange={(e) =>
                                        handleMmChange("heightMm", parseFloat(e.target.value) || 0)
                                    }
                                    className="w-24"
                                    placeholder="세로"
                                />
                                <span className="text-gray-500">mm</span>
                                {formData.heightMm > formData.widthMm && (
                                    <span className="ml-2 text-xs px-2 py-1 bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 rounded flex items-center gap-1">
                                        <ArrowUpDown className="h-3 w-3" />
                                        세로형
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* 평방미터 (자동 계산) */}
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="squareMeters" className="text-right">
                                평방m (㎡)
                            </Label>
                            <div className="col-span-3 flex items-center gap-2">
                                <Input
                                    id="squareMeters"
                                    type="number"
                                    step="0.01"
                                    value={formData.squareMeters ?? ""}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            squareMeters: e.target.value ? parseFloat(e.target.value) : undefined,
                                        })
                                    }
                                    className="w-32"
                                    placeholder="자동 계산"
                                />
                                <span className="text-sm text-gray-500">
                                    (크기 입력 시 자동 계산됩니다)
                                </span>
                            </div>
                        </div>

                        {/* 용도 체크박스 */}
                        <div className="grid grid-cols-4 items-start gap-4">
                            <Label className="text-right pt-2">용도</Label>
                            <div className="col-span-3 grid grid-cols-2 gap-x-8 gap-y-3">
                                <label className="flex items-center gap-2">
                                    <Checkbox
                                        checked={formData.forIndigo}
                                        onCheckedChange={(checked) =>
                                            setFormData({ ...formData, forIndigo: checked === true })
                                        }
                                    />
                                    <span className="text-sm">인디고출력</span>
                                </label>
                                <label className="flex items-center gap-2">
                                    <Checkbox
                                        checked={formData.forInkjet}
                                        onCheckedChange={(checked) =>
                                            setFormData({ ...formData, forInkjet: checked === true })
                                        }
                                    />
                                    <span className="text-sm">잉크젯출력</span>
                                </label>
                                <label className="flex items-center gap-2">
                                    <Checkbox
                                        checked={formData.forAlbum}
                                        onCheckedChange={(checked) =>
                                            setFormData({ ...formData, forAlbum: checked === true })
                                        }
                                    />
                                    <span className="text-sm">앨범전용</span>
                                </label>
                                <label className="flex items-center gap-2">
                                    <Checkbox
                                        checked={formData.forFrame}
                                        onCheckedChange={(checked) =>
                                            setFormData({ ...formData, forFrame: checked === true })
                                        }
                                    />
                                    <span className="text-sm">액자전용</span>
                                </label>
                                <label className="flex items-center gap-2">
                                    <Checkbox
                                        checked={formData.forBooklet}
                                        onCheckedChange={(checked) =>
                                            setFormData({ ...formData, forBooklet: checked === true })
                                        }
                                    />
                                    <span className="text-sm">인쇄책자전용</span>
                                </label>
                            </div>
                        </div>

                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsModalOpen(false)}>
                            취소
                        </Button>
                        <Button
                            onClick={handleSubmit}
                            disabled={createMutation.isPending || updateMutation.isPending}
                        >
                            {editingSpec ? "수정" : "등록"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>규격 삭제</DialogTitle>
                        <DialogDescription>
                            &quot;{deletingSpec?.name}&quot; 규격을 삭제하시겠습니까?
                            <br />
                            삭제된 규격은 복구할 수 없습니다.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
                            취소
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleDelete}
                            disabled={deleteMutation.isPending}
                        >
                            삭제
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
