"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Plus,
  Pencil,
  Trash2,
  FileImage,
  FileCode,
  BookImage,
  Loader2,
  Upload,
  X,
  Eye,
  Layers,
  Settings,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  useCopperPlatesByClient,
  useCreateCopperPlate,
  useUpdateCopperPlate,
  useDeleteCopperPlate,
  useCopperPlateLabels,
  useFoilColors,
  useCreateFoilColor,
  useUpdateFoilColor,
  useDeleteFoilColor,
  usePlatePositions,
  useCreatePlatePosition,
  useUpdatePlatePosition,
  useDeletePlatePosition,
  CopperPlate,
  CreateCopperPlateDto,
  UpdateCopperPlateDto,
  FoilColorItem,
  PlatePositionItem,
  COPPER_PLATE_STATUS_LABELS,
  COPPER_PLATE_STATUS_COLORS,
} from "@/hooks/use-copper-plates";
import { useAuthStore } from "@/stores/auth-store";

interface CopperPlateTabProps {
  clientId: string;
  clientName: string;
}

const initialFormData: Omit<CreateCopperPlateDto, 'clientId'> = {
  plateName: "",
  plateCode: "",
  foilColor: "",
  foilColorName: "",
  foilPosition: "",
  notes: "",
};

export function CopperPlateTab({ clientId, clientName }: CopperPlateTabProps) {
  const { user, accessToken } = useAuthStore();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState<'colors' | 'positions'>('colors');
  const [editingPlate, setEditingPlate] = useState<CopperPlate | null>(null);
  const [deletingPlate, setDeletingPlate] = useState<CopperPlate | null>(null);
  const [formData, setFormData] = useState<Omit<CreateCopperPlateDto, 'clientId'>>(initialFormData);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState<'ai' | 'image' | 'album' | null>(null);

  // 설정 관리용 state
  const [newColorName, setNewColorName] = useState("");
  const [newColorCode, setNewColorCode] = useState("");
  const [editingColor, setEditingColor] = useState<FoilColorItem | null>(null);
  const [newPositionName, setNewPositionName] = useState("");
  const [newPositionCode, setNewPositionCode] = useState("");
  const [editingPosition, setEditingPosition] = useState<PlatePositionItem | null>(null);

  // File refs
  const aiFileRef = useRef<HTMLInputElement>(null);
  const imageFileRef = useRef<HTMLInputElement>(null);
  const albumImageRef = useRef<HTMLInputElement>(null);

  // Queries
  const { data: plates, isLoading, refetch } = useCopperPlatesByClient(clientId);
  const { data: labelsData } = useCopperPlateLabels();
  const { data: foilColors } = useFoilColors();
  const { data: platePositions } = usePlatePositions();

  // Mutations
  const createMutation = useCreateCopperPlate();
  const updateMutation = useUpdateCopperPlate();
  const deleteMutation = useDeleteCopperPlate();

  // 박 컬러 mutations
  const createColorMutation = useCreateFoilColor();
  const updateColorMutation = useUpdateFoilColor();
  const deleteColorMutation = useDeleteFoilColor();

  // 동판 위치 mutations
  const createPositionMutation = useCreatePlatePosition();
  const updatePositionMutation = useUpdatePlatePosition();
  const deletePositionMutation = useDeletePlatePosition();

  const handleOpenDialog = (plate?: CopperPlate) => {
    if (plate) {
      setEditingPlate(plate);
      setFormData({
        plateName: plate.plateName,
        plateCode: plate.plateCode || "",
        foilColor: plate.foilColor || "",
        foilColorName: plate.foilColorName || "",
        foilPosition: plate.foilPosition || "",
        imageUrl: plate.imageUrl,
        aiFileUrl: plate.aiFileUrl,
        albumPhotoUrl: plate.albumPhotoUrl,
        notes: plate.notes || "",
        registeredAt: plate.registeredAt ? format(new Date(plate.registeredAt), "yyyy-MM-dd") : undefined,
      });
    } else {
      setEditingPlate(null);
      setFormData({
        ...initialFormData,
        registeredAt: format(new Date(), "yyyy-MM-dd"),
      });
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingPlate(null);
    setFormData(initialFormData);
  };

  const handleSubmit = async () => {
    if (!formData.plateName) {
      toast.error("동판명을 입력해주세요.");
      return;
    }
    if (!formData.foilColor) {
      toast.error("박 컬러를 선택해주세요.");
      return;
    }

    try {
      if (editingPlate) {
        const updateData: UpdateCopperPlateDto = {
          plateName: formData.plateName,
          plateCode: formData.plateCode,
          foilColor: formData.foilColor,
          foilColorName: formData.foilColorName,
          foilPosition: formData.foilPosition,
          imageUrl: formData.imageUrl,
          aiFileUrl: formData.aiFileUrl,
          albumPhotoUrl: formData.albumPhotoUrl,
          notes: formData.notes,
          registeredAt: formData.registeredAt,
        };
        await updateMutation.mutateAsync({ id: editingPlate.id, dto: updateData });
        toast.success("동판 정보가 수정되었습니다.");
      } else {
        const createData: CreateCopperPlateDto = {
          clientId,
          ...formData,
          registeredById: user?.id,
          registeredBy: user?.name || user?.email,
        };
        await createMutation.mutateAsync(createData);
        toast.success("동판이 등록되었습니다.");
      }
      handleCloseDialog();
      refetch();
    } catch (error) {
      toast.error(editingPlate ? "동판 수정에 실패했습니다." : "동판 등록에 실패했습니다.");
    }
  };

  const handleDelete = async () => {
    if (!deletingPlate) return;

    try {
      await deleteMutation.mutateAsync(deletingPlate.id);
      toast.success("동판이 삭제되었습니다.");
      setIsDeleteDialogOpen(false);
      setDeletingPlate(null);
      refetch();
    } catch (error) {
      toast.error("동판 삭제에 실패했습니다.");
    }
  };

  const handleFileUpload = async (file: File, type: 'ai' | 'image' | 'album') => {
    const endpointMap = {
      ai: '/upload/copper-plate/ai',
      image: '/upload/copper-plate/image',
      album: '/upload/copper-plate/album',
    };

    const labelMap = {
      ai: 'AI 파일',
      image: '이미지',
      album: '앨범 이미지',
    };

    setIsUploading(type);

    try {
      const formDataUpload = new FormData();
      formDataUpload.append('file', file);

      // 토큰 가져오기 (store 또는 storage에서)
      const token = accessToken || localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken');

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}${endpointMap[type]}`, {
        method: 'POST',
        body: formDataUpload,
        headers: {
          ...(token && { 'Authorization': `Bearer ${token}` }),
        },
      });

      if (!response.ok) {
        throw new Error('업로드 실패');
      }

      const result = await response.json();
      // 상대 경로만 저장 (전체 URL은 표시 시 구성)
      const url = result.url;

      if (type === 'ai') {
        setFormData(prev => ({ ...prev, aiFileUrl: url }));
      } else if (type === 'image') {
        setFormData(prev => ({ ...prev, imageUrl: url }));
      } else if (type === 'album') {
        setFormData(prev => ({ ...prev, albumPhotoUrl: url }));
      }

      toast.success(`${labelMap[type]}이 업로드되었습니다.`);
    } catch (error) {
      toast.error(`${labelMap[type]} 업로드에 실패했습니다.`);
    } finally {
      setIsUploading(null);
    }
  };

  // 박 컬러 추가/수정
  const handleAddColor = async () => {
    if (!newColorName || !newColorCode) {
      toast.error("코드와 이름을 입력해주세요.");
      return;
    }
    try {
      if (editingColor) {
        await updateColorMutation.mutateAsync({
          id: editingColor.id,
          data: { code: newColorCode, name: newColorName },
        });
        toast.success("박 컬러가 수정되었습니다.");
        setEditingColor(null);
      } else {
        await createColorMutation.mutateAsync({ code: newColorCode, name: newColorName });
        toast.success("박 컬러가 추가되었습니다.");
      }
      setNewColorName("");
      setNewColorCode("");
    } catch (error: any) {
      toast.error(error.message || "박 컬러 저장에 실패했습니다.");
    }
  };

  const handleDeleteColor = async (id: string) => {
    try {
      await deleteColorMutation.mutateAsync(id);
      toast.success("박 컬러가 삭제되었습니다.");
    } catch (error) {
      toast.error("박 컬러 삭제에 실패했습니다.");
    }
  };

  // 동판 위치 추가/수정
  const handleAddPosition = async () => {
    if (!newPositionName || !newPositionCode) {
      toast.error("코드와 이름을 입력해주세요.");
      return;
    }
    try {
      if (editingPosition) {
        await updatePositionMutation.mutateAsync({
          id: editingPosition.id,
          data: { code: newPositionCode, name: newPositionName },
        });
        toast.success("동판 위치가 수정되었습니다.");
        setEditingPosition(null);
      } else {
        await createPositionMutation.mutateAsync({ code: newPositionCode, name: newPositionName });
        toast.success("동판 위치가 추가되었습니다.");
      }
      setNewPositionName("");
      setNewPositionCode("");
    } catch (error: any) {
      toast.error(error.message || "동판 위치 저장에 실패했습니다.");
    }
  };

  const handleDeletePosition = async (id: string) => {
    try {
      await deletePositionMutation.mutateAsync(id);
      toast.success("동판 위치가 삭제되었습니다.");
    } catch (error) {
      toast.error("동판 위치 삭제에 실패했습니다.");
    }
  };

  // 라벨에서 이름 찾기
  const getFoilColorName = (code: string) => {
    const color = labelsData?.foilColors?.find(c => c.code === code);
    return color?.name || code;
  };

  const getPositionName = (code: string) => {
    const position = labelsData?.platePositions?.find(p => p.code === code);
    return position?.name || code;
  };

  // 이미지 URL을 전체 URL로 변환 (상대 경로인 경우 API URL 붙이기)
  const getFullImageUrl = (url: string | null | undefined): string | null => {
    if (!url) return null;

    // 중복된 /api/v1/ 경로 수정 (데이터베이스에 잘못 저장된 경우)
    let cleanUrl = url.replace(/\/api\/v1\/api\/v1\//g, '/api/v1/');

    // /api/v1/로 시작하는 경로 정규화 (항상 /api/v1/ 제거)
    cleanUrl = cleanUrl.replace(/^\/api\/v1\//, '/');

    // 이미 전체 URL인 경우 - /api/v1/ 중복 제거 후 반환
    if (cleanUrl.startsWith('http://') || cleanUrl.startsWith('https://')) {
      return cleanUrl.replace(/\/api\/v1\/api\/v1\//g, '/api/v1/');
    }

    // 상대 경로인 경우 API Base URL 붙이기 (api/v1 포함)
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';
    return `${apiUrl}${cleanUrl.startsWith('/') ? '' : '/'}${cleanUrl}`;
  };

  return (
    <div className="p-5 border rounded-xl bg-gradient-to-r from-amber-50/70 to-transparent">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-amber-700 flex items-center gap-2">
          <Layers className="h-4 w-4" />
          동판 목록
          {plates && plates.length > 0 && (
            <Badge variant="secondary" className="ml-2">{plates.length}개</Badge>
          )}
        </h3>
        <Button variant="outline" size="sm" onClick={() => handleOpenDialog()}>
          <Plus className="h-4 w-4 mr-1" />
          동판 등록
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : plates && plates.length > 0 ? (
        <div className="rounded-lg border overflow-hidden bg-white">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/80">
                <TableHead>등록일</TableHead>
                <TableHead>동판명</TableHead>
                <TableHead className="text-center">박 컬러</TableHead>
                <TableHead className="text-center">동판 위치</TableHead>
                <TableHead className="text-center">파일</TableHead>
                <TableHead className="text-center">상태</TableHead>
                <TableHead className="text-right">작업</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {plates.map((plate) => (
                <TableRow key={plate.id}>
                  <TableCell>
                    <div className="text-sm">
                      {format(new Date(plate.registeredAt), "yyyy-MM-dd")}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{plate.plateName}</div>
                    {plate.plateCode && (
                      <div className="text-xs text-muted-foreground">{plate.plateCode}</div>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline" className="bg-yellow-50 border-yellow-300">
                      {getFoilColorName(plate.foilColor)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    {plate.foilPosition ? (
                      <Badge variant="outline" className="bg-blue-50 border-blue-300">
                        {getPositionName(plate.foilPosition)}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground text-xs">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-center gap-2">
                      {plate.aiFileUrl && (
                        <button
                          type="button"
                          onClick={() => window.open(getFullImageUrl(plate.aiFileUrl) || '', '_blank')}
                          className="p-1 hover:bg-gray-100 rounded"
                          title="AI 파일"
                        >
                          <FileCode className="h-4 w-4 text-orange-500" />
                        </button>
                      )}
                      {plate.imageUrl && (
                        <button
                          type="button"
                          onClick={() => setPreviewImage(getFullImageUrl(plate.imageUrl))}
                          className="p-1 hover:bg-gray-100 rounded"
                          title="동판 이미지"
                        >
                          <FileImage className="h-4 w-4 text-blue-500" />
                        </button>
                      )}
                      {plate.albumPhotoUrl && (
                        <button
                          type="button"
                          onClick={() => setPreviewImage(getFullImageUrl(plate.albumPhotoUrl))}
                          className="p-1 hover:bg-gray-100 rounded"
                          title="앨범 이미지"
                        >
                          <BookImage className="h-4 w-4 text-purple-500" />
                        </button>
                      )}
                      {!plate.aiFileUrl && !plate.imageUrl && !plate.albumPhotoUrl && (
                        <span className="text-muted-foreground text-xs">-</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge className={COPPER_PLATE_STATUS_COLORS[plate.status]}>
                      {COPPER_PLATE_STATUS_LABELS[plate.status]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleOpenDialog(plate)}
                        className="h-7 w-7 p-0"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0 text-red-500 hover:text-red-600"
                        onClick={() => {
                          setDeletingPlate(plate);
                          setIsDeleteDialogOpen(true);
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="text-center py-12 text-muted-foreground">
          <Layers className="h-12 w-12 mx-auto mb-4 opacity-20" />
          <p>등록된 동판이 없습니다.</p>
          <p className="text-xs mt-2">이 회원의 로고/낙관 동판을 관리합니다.</p>
        </div>
      )}

      {/* 등록/수정 다이얼로그 */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingPlate ? "동판 수정" : "동판 등록"}</DialogTitle>
            <DialogDescription>
              {clientName}의 동판 정보를 {editingPlate ? "수정" : "입력"}합니다.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* 등록일 & 동판명 */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>등록일 *</Label>
                <Input
                  type="date"
                  value={formData.registeredAt || ""}
                  onChange={(e) => setFormData(prev => ({ ...prev, registeredAt: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>동판명 *</Label>
                <Input
                  value={formData.plateName}
                  onChange={(e) => setFormData(prev => ({ ...prev, plateName: e.target.value }))}
                  placeholder="동판명을 입력하세요"
                />
              </div>
            </div>

            {/* 박 컬러 & 동판 위치 */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>박 컬러 *</Label>
                <Select
                  value={formData.foilColor}
                  onValueChange={(v) => setFormData(prev => ({ ...prev, foilColor: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="박 컬러 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {labelsData?.foilColors?.map((color) => (
                      <SelectItem key={color.code} value={color.code}>
                        {color.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>동판 위치</Label>
                <Select
                  value={formData.foilPosition || "none"}
                  onValueChange={(v) => setFormData(prev => ({ ...prev, foilPosition: v === "none" ? "" : v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="동판 위치 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">선택 안함</SelectItem>
                    {labelsData?.platePositions?.map((pos) => (
                      <SelectItem key={pos.code} value={pos.code}>
                        {pos.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* AI 파일 */}
            <div className="space-y-2">
              <Label>동판 AI 파일</Label>
              <div className="flex items-center gap-2">
                <Input
                  value={formData.aiFileUrl || ""}
                  onChange={(e) => setFormData(prev => ({ ...prev, aiFileUrl: e.target.value }))}
                  placeholder="AI 파일 URL 또는 업로드"
                  className="flex-1"
                />
                <input
                  type="file"
                  ref={aiFileRef}
                  className="hidden"
                  accept=".ai,.pdf,.eps"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileUpload(file, 'ai');
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => aiFileRef.current?.click()}
                  disabled={isUploading === 'ai'}
                >
                  {isUploading === 'ai' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                </Button>
                {formData.aiFileUrl && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setFormData(prev => ({ ...prev, aiFileUrl: undefined }))}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>

            {/* 동판 이미지 */}
            <div className="space-y-2">
              <Label>동판 이미지 (JPG, PNG, PDF)</Label>
              <div className="flex items-center gap-2">
                <Input
                  value={formData.imageUrl || ""}
                  onChange={(e) => setFormData(prev => ({ ...prev, imageUrl: e.target.value }))}
                  placeholder="이미지 URL 또는 업로드"
                  className="flex-1"
                />
                <input
                  type="file"
                  ref={imageFileRef}
                  className="hidden"
                  accept=".jpg,.jpeg,.png,.pdf"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileUpload(file, 'image');
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => imageFileRef.current?.click()}
                  disabled={isUploading === 'image'}
                >
                  {isUploading === 'image' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                </Button>
                {formData.imageUrl && (
                  <>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setPreviewImage(getFullImageUrl(formData.imageUrl))}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setFormData(prev => ({ ...prev, imageUrl: undefined }))}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </>
                )}
              </div>
            </div>

            {/* 앨범 이미지 */}
            <div className="space-y-2">
              <Label>앨범 이미지</Label>
              <div className="flex items-center gap-2">
                <Input
                  value={formData.albumPhotoUrl || ""}
                  onChange={(e) => setFormData(prev => ({ ...prev, albumPhotoUrl: e.target.value }))}
                  placeholder="앨범 이미지 URL 또는 업로드"
                  className="flex-1"
                />
                <input
                  type="file"
                  ref={albumImageRef}
                  className="hidden"
                  accept=".jpg,.jpeg,.png"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileUpload(file, 'album');
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => albumImageRef.current?.click()}
                  disabled={isUploading === 'album'}
                >
                  {isUploading === 'album' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                </Button>
                {formData.albumPhotoUrl && (
                  <>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setPreviewImage(getFullImageUrl(formData.albumPhotoUrl))}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setFormData(prev => ({ ...prev, albumPhotoUrl: undefined }))}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </>
                )}
              </div>
            </div>

            {/* 메모 */}
            <div className="space-y-2">
              <Label>메모</Label>
              <Textarea
                value={formData.notes || ""}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="메모를 입력하세요"
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>
              취소
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {(createMutation.isPending || updateMutation.isPending) && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              {editingPlate ? "수정" : "등록"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 설정 다이얼로그 (박 컬러 / 동판 위치 관리) */}
      <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>동판 설정 관리</DialogTitle>
            <DialogDescription>
              박 컬러와 동판 위치를 추가, 수정, 삭제할 수 있습니다.
            </DialogDescription>
          </DialogHeader>

          {/* 탭 전환 */}
          <div className="flex gap-2 border-b pb-2">
            <Button
              variant={settingsTab === 'colors' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setSettingsTab('colors')}
            >
              박 컬러
            </Button>
            <Button
              variant={settingsTab === 'positions' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setSettingsTab('positions')}
            >
              동판 위치
            </Button>
          </div>

          {settingsTab === 'colors' ? (
            <div className="space-y-4">
              {/* 박 컬러 추가 폼 */}
              <div className="flex gap-2">
                <Input
                  placeholder="코드 (예: gold_glossy)"
                  value={newColorCode}
                  onChange={(e) => setNewColorCode(e.target.value)}
                  className="w-40"
                />
                <Input
                  placeholder="이름 (예: 금박(유광))"
                  value={newColorName}
                  onChange={(e) => setNewColorName(e.target.value)}
                  className="flex-1"
                />
                <Button
                  onClick={handleAddColor}
                  disabled={createColorMutation.isPending || updateColorMutation.isPending}
                >
                  {(createColorMutation.isPending || updateColorMutation.isPending) && (
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  )}
                  {editingColor ? "수정" : "추가"}
                </Button>
                {editingColor && (
                  <Button variant="outline" onClick={() => {
                    setEditingColor(null);
                    setNewColorCode("");
                    setNewColorName("");
                  }}>
                    취소
                  </Button>
                )}
              </div>

              {/* 박 컬러 목록 */}
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>코드</TableHead>
                      <TableHead>이름</TableHead>
                      <TableHead className="text-right">작업</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {foilColors?.map((color) => (
                      <TableRow key={color.id}>
                        <TableCell className="font-mono text-sm">{color.code}</TableCell>
                        <TableCell>{color.name}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setEditingColor(color);
                                setNewColorCode(color.code);
                                setNewColorName(color.name);
                              }}
                              className="h-7 w-7 p-0"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0 text-red-500"
                              onClick={() => handleDeleteColor(color.id)}
                              disabled={deleteColorMutation.isPending}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {(!foilColors || foilColors.length === 0) && (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                          등록된 박 컬러가 없습니다.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* 동판 위치 추가 폼 */}
              <div className="flex gap-2">
                <Input
                  placeholder="코드 (예: center)"
                  value={newPositionCode}
                  onChange={(e) => setNewPositionCode(e.target.value)}
                  className="w-40"
                />
                <Input
                  placeholder="이름 (예: 정중앙)"
                  value={newPositionName}
                  onChange={(e) => setNewPositionName(e.target.value)}
                  className="flex-1"
                />
                <Button
                  onClick={handleAddPosition}
                  disabled={createPositionMutation.isPending || updatePositionMutation.isPending}
                >
                  {(createPositionMutation.isPending || updatePositionMutation.isPending) && (
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  )}
                  {editingPosition ? "수정" : "추가"}
                </Button>
                {editingPosition && (
                  <Button variant="outline" onClick={() => {
                    setEditingPosition(null);
                    setNewPositionCode("");
                    setNewPositionName("");
                  }}>
                    취소
                  </Button>
                )}
              </div>

              {/* 동판 위치 목록 */}
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>코드</TableHead>
                      <TableHead>이름</TableHead>
                      <TableHead className="text-right">작업</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {platePositions?.map((position) => (
                      <TableRow key={position.id}>
                        <TableCell className="font-mono text-sm">{position.code}</TableCell>
                        <TableCell>{position.name}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setEditingPosition(position);
                                setNewPositionCode(position.code);
                                setNewPositionName(position.name);
                              }}
                              className="h-7 w-7 p-0"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0 text-red-500"
                              onClick={() => handleDeletePosition(position.id)}
                              disabled={deletePositionMutation.isPending}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {(!platePositions || platePositions.length === 0) && (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                          등록된 동판 위치가 없습니다.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 삭제 확인 다이얼로그 */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>동판 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              &quot;{deletingPlate?.plateName}&quot; 동판을 삭제하시겠습니까?
              <br />
              이 작업은 되돌릴 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-500 hover:bg-red-600"
            >
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 이미지 미리보기 */}
      <Dialog open={!!previewImage} onOpenChange={() => setPreviewImage(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>이미지 미리보기</DialogTitle>
          </DialogHeader>
          {previewImage && (
            <div className="flex flex-col items-center gap-4">
              <div className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={previewImage}
                  alt="동판 이미지"
                  className="max-h-[70vh] object-contain rounded-lg"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    const errorDiv = target.nextElementSibling as HTMLElement;
                    if (errorDiv) errorDiv.style.display = 'flex';
                  }}
                  onLoad={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'block';
                    const errorDiv = target.nextElementSibling as HTMLElement;
                    if (errorDiv) errorDiv.style.display = 'none';
                  }}
                />
                <div
                  className="hidden flex-col items-center justify-center p-8 bg-gray-100 rounded-lg min-w-[300px] min-h-[200px]"
                >
                  <FileImage className="h-12 w-12 text-gray-400 mb-4" />
                  <p className="text-gray-600 font-medium">이미지를 불러올 수 없습니다</p>
                  <p className="text-sm text-gray-500 mt-1">URL을 확인해주세요</p>
                </div>
              </div>
              <div className="text-xs text-muted-foreground max-w-full truncate px-4">
                {previewImage}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
