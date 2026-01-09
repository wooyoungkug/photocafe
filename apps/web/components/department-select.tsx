'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    useDepartments,
    useCreateDepartment,
    useUpdateDepartment,
    useDeleteDepartment,
} from '@/hooks/use-staff';
import { Department } from '@/lib/types/staff';
import {
    Settings,
    Plus,
    Edit,
    Trash2,
    Loader2,
    Check,
    ChevronDown,
    X,
    Building,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface DepartmentSelectProps {
    value: string;
    onChange: (value: string) => void;
}

export function DepartmentSelect({ value, onChange }: DepartmentSelectProps) {
    const { toast } = useToast();
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const [isManageOpen, setIsManageOpen] = useState(false);
    const [editingDept, setEditingDept] = useState<Department | null>(null);
    const [editName, setEditName] = useState('');
    const [deleteConfirm, setDeleteConfirm] = useState<Department | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const { data: departments } = useDepartments();
    const createDept = useCreateDepartment();
    const updateDept = useUpdateDepartment();
    const deleteDept = useDeleteDepartment();

    // Find selected department
    const selectedDept = departments?.find((d) => d.id === value);

    // Filter departments by search
    const filteredDepts = departments?.filter((d) =>
        d.name.toLowerCase().includes(search.toLowerCase())
    );

    // Check if search matches any existing department
    const exactMatch = departments?.find(
        (d) => d.name.toLowerCase() === search.toLowerCase()
    );

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelect = (deptId: string) => {
        onChange(deptId);
        setIsOpen(false);
        setSearch('');
    };

    const handleCreateNew = async () => {
        if (!search.trim()) return;

        try {
            // Generate code from name (first 3 characters uppercase)
            const code = search.trim().substring(0, 3).toUpperCase() + Date.now().toString().slice(-4);

            const newDept = await createDept.mutateAsync({
                code,
                name: search.trim(),
                isActive: true,
                sortOrder: (departments?.length || 0) + 1,
            });

            onChange(newDept.id);
            setIsOpen(false);
            setSearch('');

            toast({
                title: '성공',
                description: `'${search.trim()}' 부서가 생성되었습니다`,
            });
        } catch (error) {
            toast({
                title: '오류',
                description: error instanceof Error ? error.message : '부서 생성 실패',
                variant: 'destructive',
            });
        }
    };

    const handleStartEdit = (dept: Department) => {
        setEditingDept(dept);
        setEditName(dept.name);
    };

    const handleSaveEdit = async () => {
        if (!editingDept || !editName.trim()) return;

        try {
            await updateDept.mutateAsync({
                id: editingDept.id,
                data: { name: editName.trim() },
            });

            toast({
                title: '성공',
                description: '부서가 수정되었습니다',
            });
            setEditingDept(null);
        } catch (error) {
            toast({
                title: '오류',
                description: error instanceof Error ? error.message : '부서 수정 실패',
                variant: 'destructive',
            });
        }
    };

    const handleDelete = async () => {
        if (!deleteConfirm) return;

        try {
            await deleteDept.mutateAsync(deleteConfirm.id);

            // If deleted department was selected, clear selection
            if (value === deleteConfirm.id) {
                onChange('');
            }

            toast({
                title: '성공',
                description: '부서가 삭제되었습니다',
            });
            setDeleteConfirm(null);
        } catch (error) {
            toast({
                title: '오류',
                description: error instanceof Error ? error.message : '부서 삭제 실패',
                variant: 'destructive',
            });
        }
    };

    return (
        <div className="space-y-2">
            <div className="flex items-center gap-2">
                <Label>부서</Label>
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={() => setIsManageOpen(true)}
                >
                    <Settings className="h-3.5 w-3.5" />
                </Button>
            </div>

            <div ref={containerRef} className="relative">
                {/* Trigger button */}
                <Button
                    type="button"
                    variant="outline"
                    role="combobox"
                    aria-expanded={isOpen}
                    className="w-full justify-between"
                    onClick={() => setIsOpen(!isOpen)}
                >
                    {selectedDept ? (
                        <span className="flex items-center gap-2">
                            <Building className="h-4 w-4" />
                            {selectedDept.name}
                        </span>
                    ) : (
                        <span className="text-muted-foreground">부서 선택 또는 입력...</span>
                    )}
                    <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>

                {/* Dropdown */}
                {isOpen && (
                    <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover p-0 text-popover-foreground shadow-md">
                        {/* Search input */}
                        <div className="flex items-center border-b px-3">
                            <Input
                                placeholder="검색 또는 새 부서 입력..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="border-0 focus-visible:ring-0 h-9"
                                autoFocus
                            />
                        </div>

                        {/* Options list */}
                        <div className="max-h-48 overflow-y-auto p-1">
                            {/* None option */}
                            <button
                                type="button"
                                className={cn(
                                    "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent",
                                    !value && "bg-accent"
                                )}
                                onClick={() => handleSelect('')}
                            >
                                <Check className={cn("h-4 w-4", value ? "opacity-0" : "opacity-100")} />
                                <span className="text-muted-foreground">부서 없음</span>
                            </button>

                            {/* Department options */}
                            {filteredDepts?.map((dept) => (
                                <button
                                    key={dept.id}
                                    type="button"
                                    className={cn(
                                        "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent",
                                        value === dept.id && "bg-accent"
                                    )}
                                    onClick={() => handleSelect(dept.id)}
                                >
                                    <Check className={cn("h-4 w-4", value === dept.id ? "opacity-100" : "opacity-0")} />
                                    {dept.name}
                                    {!dept.isActive && (
                                        <Badge variant="secondary" className="ml-auto text-xs">비활성</Badge>
                                    )}
                                </button>
                            ))}

                            {/* Create new option */}
                            {search.trim() && !exactMatch && (
                                <button
                                    type="button"
                                    className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent text-primary"
                                    onClick={handleCreateNew}
                                    disabled={createDept.isPending}
                                >
                                    {createDept.isPending ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <Plus className="h-4 w-4" />
                                    )}
                                    <span>새 부서 추가: &quot;{search}&quot;</span>
                                </button>
                            )}

                            {/* Empty state */}
                            {filteredDepts?.length === 0 && !search.trim() && (
                                <div className="py-6 text-center text-sm text-muted-foreground">
                                    등록된 부서가 없습니다
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Department Management Dialog */}
            <Dialog open={isManageOpen} onOpenChange={setIsManageOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Building className="h-5 w-5" />
                            부서 관리
                        </DialogTitle>
                        <DialogDescription>
                            부서를 수정하거나 삭제할 수 있습니다. 직원이 있는 부서는 삭제할 수 없습니다.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="max-h-64 overflow-y-auto space-y-1">
                        {departments?.length === 0 ? (
                            <div className="py-8 text-center text-muted-foreground">
                                등록된 부서가 없습니다
                            </div>
                        ) : (
                            departments?.map((dept) => (
                                <div
                                    key={dept.id}
                                    className="flex items-center justify-between p-2 rounded-md hover:bg-muted"
                                >
                                    {editingDept?.id === dept.id ? (
                                        <div className="flex items-center gap-2 flex-1">
                                            <Input
                                                value={editName}
                                                onChange={(e) => setEditName(e.target.value)}
                                                className="h-8"
                                                autoFocus
                                            />
                                            <Button
                                                size="sm"
                                                onClick={handleSaveEdit}
                                                disabled={updateDept.isPending}
                                            >
                                                {updateDept.isPending ? (
                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                ) : (
                                                    <Check className="h-4 w-4" />
                                                )}
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={() => setEditingDept(null)}
                                            >
                                                <X className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="flex items-center gap-2">
                                                <span className="font-medium">{dept.name}</span>
                                                {dept._count?.staff ? (
                                                    <Badge variant="secondary" className="text-xs">
                                                        직원 {dept._count.staff}명
                                                    </Badge>
                                                ) : null}
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={() => handleStartEdit(dept)}
                                                >
                                                    <Edit className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={() => setDeleteConfirm(dept)}
                                                    disabled={dept._count?.staff ? dept._count.staff > 0 : false}
                                                >
                                                    <Trash2 className="h-4 w-4 text-destructive" />
                                                </Button>
                                            </div>
                                        </>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>부서 삭제</DialogTitle>
                        <DialogDescription>
                            &apos;{deleteConfirm?.name}&apos; 부서를 삭제하시겠습니까?
                            <br />
                            이 작업은 되돌릴 수 없습니다.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
                            취소
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleDelete}
                            disabled={deleteDept.isPending}
                        >
                            {deleteDept.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                            삭제
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
