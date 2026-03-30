'use client';

import { useState, useCallback } from 'react';
import { Copy, Trash2, Edit2, Star } from 'lucide-react';
import { Button } from '@/presentation/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/presentation/components/ui/dialog';
import { Input } from '@/presentation/components/ui/input';
import { Textarea } from '@/presentation/components/ui/textarea';
import { Badge } from '@/presentation/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/presentation/components/ui/card';
import { Label } from '@/presentation/components/ui/label';

interface ProposalTemplate {
  id: string;
  name: string;
  description: string;
  defaultTerms: string;
  defaultPaymentTerms: string;
  defaultDeliveryTerms: string;
  defaultValidityDays: number;
  defaultNotes: string;
  isDefault: boolean;
  usageCount: number;
}

const MOCK_TEMPLATES: ProposalTemplate[] = [
  {
    id: 'template-1',
    name: 'Standart Teklif',
    description: 'Genel hizmetler ve ürünler için standart teklif şablonu',
    defaultTerms: 'Teklif bedeli, belirtilen tarihten itibaren 30 gün geçerlidir. Ödeme koşulları: peşin veya 2 taksit.',
    defaultPaymentTerms: 'Peşin ödeme veya 30 günü aşmayan kredili işlem',
    defaultDeliveryTerms: 'Ürünler kargo ile 3-5 iş günü içinde teslim edilir',
    defaultValidityDays: 30,
    defaultNotes: 'Teklif fiyatları KDV hariçtir. Yazılı onay alındığında iş başlanır.',
    isDefault: true,
    usageCount: 145,
  },
  {
    id: 'template-2',
    name: 'Hizmet Teklifi',
    description: 'Danışmanlık, eğitim ve hizmet projelerine yönelik şablon',
    defaultTerms: 'Hizmet bedeli, belirtilen tarihten itibaren 45 gün geçerlidir. Hizmet başlangıcı öncesi sözleşme imzalanması gereklidir.',
    defaultPaymentTerms: 'Proje başlangıcında %50, tamamlanmasında %50',
    defaultDeliveryTerms: 'Hizmetler tamamlanma tarihi itibarı ile 5 iş günü içinde teslim edilir',
    defaultValidityDays: 45,
    defaultNotes: 'Hizmet takvimi ortaya çıkacak değişikliklere göre ayarlanabilir.',
    isDefault: false,
    usageCount: 87,
  },
  {
    id: 'template-3',
    name: 'Proje Bazlı Teklif',
    description: 'Büyük ölçekli projelere yönelik detaylı teklif şablonu',
    defaultTerms: 'Teklif, sunulmadan 60 gün boyunca geçerlidir. Proje kapsamında değişiklik yapılması durumunda yeni teklif sunulur.',
    defaultPaymentTerms: 'Aylık taksitler veya mihenk taşlarına bağlı ödeme',
    defaultDeliveryTerms: 'Projedeki her aşama tamamlanmadan sonra teslimat gerçekleştirilir',
    defaultValidityDays: 60,
    defaultNotes: 'Proje planı ayrı belge olarak sunulacaktır. İnsan kaynağı ve materyal maliyetleri gösterilmiştir.',
    isDefault: false,
    usageCount: 56,
  },
];

interface NewTemplateFormData {
  name: string;
  description: string;
  defaultTerms: string;
  defaultPaymentTerms: string;
  defaultDeliveryTerms: string;
  defaultValidityDays: string;
  defaultNotes: string;
}

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<ProposalTemplate[]>(MOCK_TEMPLATES);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ProposalTemplate | null>(null);
  const [formData, setFormData] = useState<NewTemplateFormData>({
    name: '',
    description: '',
    defaultTerms: '',
    defaultPaymentTerms: '',
    defaultDeliveryTerms: '',
    defaultValidityDays: '30',
    defaultNotes: '',
  });

  const handleOpenDialog = useCallback((template?: ProposalTemplate) => {
    if (template) {
      setEditingTemplate(template);
      setFormData({
        name: template.name,
        description: template.description,
        defaultTerms: template.defaultTerms,
        defaultPaymentTerms: template.defaultPaymentTerms,
        defaultDeliveryTerms: template.defaultDeliveryTerms,
        defaultValidityDays: template.defaultValidityDays.toString(),
        defaultNotes: template.defaultNotes,
      });
    } else {
      setEditingTemplate(null);
      setFormData({
        name: '',
        description: '',
        defaultTerms: '',
        defaultPaymentTerms: '',
        defaultDeliveryTerms: '',
        defaultValidityDays: '30',
        defaultNotes: '',
      });
    }
    setOpenDialog(true);
  }, []);

  const handleSaveTemplate = useCallback(() => {
    if (!formData.name.trim()) {
      alert('Şablon adı gereklidir');
      return;
    }

    if (editingTemplate) {
      setTemplates((prev) =>
        prev.map((t) =>
          t.id === editingTemplate.id
            ? {
                ...t,
                name: formData.name,
                description: formData.description,
                defaultTerms: formData.defaultTerms,
                defaultPaymentTerms: formData.defaultPaymentTerms,
                defaultDeliveryTerms: formData.defaultDeliveryTerms,
                defaultValidityDays: parseInt(formData.defaultValidityDays) || 30,
                defaultNotes: formData.defaultNotes,
              }
            : t
        )
      );
    } else {
      const newTemplate: ProposalTemplate = {
        id: `template-${Date.now()}`,
        name: formData.name,
        description: formData.description,
        defaultTerms: formData.defaultTerms,
        defaultPaymentTerms: formData.defaultPaymentTerms,
        defaultDeliveryTerms: formData.defaultDeliveryTerms,
        defaultValidityDays: parseInt(formData.defaultValidityDays) || 30,
        defaultNotes: formData.defaultNotes,
        isDefault: false,
        usageCount: 0,
      };
      setTemplates((prev) => [newTemplate, ...prev]);
    }

    setOpenDialog(false);
  }, [formData, editingTemplate]);

  const handleDeleteTemplate = useCallback((id: string) => {
    if (confirm('Bu şablonu silmek istediğinize emin misiniz?')) {
      setTemplates((prev) => prev.filter((t) => t.id !== id));
    }
  }, []);

  const handleDuplicateTemplate = useCallback((template: ProposalTemplate) => {
    const duplicatedTemplate: ProposalTemplate = {
      ...template,
      id: `template-${Date.now()}`,
      name: `${template.name} (Kopya)`,
      isDefault: false,
      usageCount: 0,
    };
    setTemplates((prev) => [duplicatedTemplate, ...prev]);
  }, []);

  const handleSetAsDefault = useCallback((id: string) => {
    setTemplates((prev) =>
      prev.map((t) => ({
        ...t,
        isDefault: t.id === id,
      }))
    );
  }, []);

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Teklif Şablonları</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Tekliflerinizi daha hızlı oluşturmak için şablonlar yönetin
          </p>
        </div>
        <Dialog open={openDialog} onOpenChange={setOpenDialog}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpenDialog()} className="gap-2">
              + Yeni Şablon
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] w-full max-w-2xl overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingTemplate ? 'Şablonu Düzenle' : 'Yeni Şablon Oluştur'}
              </DialogTitle>
              <DialogDescription>
                {editingTemplate
                  ? 'Şablon bilgilerini güncelleyin'
                  : 'Yeni bir teklif şablonu oluşturun'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {/* Template Name */}
              <div>
                <Label htmlFor="template-name">Şablon Adı</Label>
                <Input
                  id="template-name"
                  placeholder="örn: Standart Teklif"
                  className="mt-2"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              {/* Description */}
              <div>
                <Label htmlFor="template-description">Açıklama</Label>
                <Input
                  id="template-description"
                  placeholder="Bu şablonun ne için kullanılacağını açıklayın"
                  className="mt-2"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              {/* Default Terms */}
              <div>
                <Label htmlFor="default-terms">Varsayılan Şartlar</Label>
                <Textarea
                  id="default-terms"
                  placeholder="Teklif geçerlilik süresi, genel koşullar..."
                  className="mt-2 min-h-24"
                  value={formData.defaultTerms}
                  onChange={(e) => setFormData({ ...formData, defaultTerms: e.target.value })}
                />
              </div>

              {/* Default Payment Terms */}
              <div>
                <Label htmlFor="default-payment-terms">Varsayılan Ödeme Şartları</Label>
                <Textarea
                  id="default-payment-terms"
                  placeholder="Ödeme yöntemleri, taksit seçenekleri..."
                  className="mt-2 min-h-20"
                  value={formData.defaultPaymentTerms}
                  onChange={(e) =>
                    setFormData({ ...formData, defaultPaymentTerms: e.target.value })
                  }
                />
              </div>

              {/* Default Delivery Terms */}
              <div>
                <Label htmlFor="default-delivery-terms">Varsayılan Teslimat Şartları</Label>
                <Textarea
                  id="default-delivery-terms"
                  placeholder="Teslimat yöntemi, süresi..."
                  className="mt-2 min-h-20"
                  value={formData.defaultDeliveryTerms}
                  onChange={(e) =>
                    setFormData({ ...formData, defaultDeliveryTerms: e.target.value })
                  }
                />
              </div>

              {/* Default Validity Days */}
              <div>
                <Label htmlFor="default-validity-days">Varsayılan Geçerlilik Süresi (Gün)</Label>
                <Input
                  id="default-validity-days"
                  type="number"
                  placeholder="30"
                  className="mt-2"
                  min="1"
                  value={formData.defaultValidityDays}
                  onChange={(e) =>
                    setFormData({ ...formData, defaultValidityDays: e.target.value })
                  }
                />
              </div>

              {/* Default Notes */}
              <div>
                <Label htmlFor="default-notes">Varsayılan Notlar</Label>
                <Textarea
                  id="default-notes"
                  placeholder="Ek notlar, uyarılar..."
                  className="mt-2 min-h-20"
                  value={formData.defaultNotes}
                  onChange={(e) => setFormData({ ...formData, defaultNotes: e.target.value })}
                />
              </div>

              {/* Dialog Actions */}
              <div className="flex gap-3 pt-4">
                <Button variant="outline" onClick={() => setOpenDialog(false)}>
                  İptal
                </Button>
                <Button onClick={handleSaveTemplate}>
                  {editingTemplate ? 'Güncelle' : 'Oluştur'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {templates.map((template) => (
          <Card
            key={template.id}
            className="flex flex-col overflow-hidden transition-shadow hover:shadow-lg"
          >
            {/* Template Header with Thumbnail */}
            <div className="relative h-32 bg-gradient-to-br from-blue-50 to-indigo-50">
              {template.isDefault && (
                <div className="absolute right-3 top-3">
                  <Badge className="gap-1 bg-yellow-100 text-yellow-800">
                    <Star className="h-3 w-3 fill-current" />
                    Varsayılan
                  </Badge>
                </div>
              )}
              <div className="flex h-full items-center justify-center">
                <div className="text-center">
                  <p className="text-2xl font-semibold text-muted-foreground">
                    {template.name.slice(0, 2).toUpperCase()}
                  </p>
                </div>
              </div>
            </div>

            {/* Template Content */}
            <CardHeader className="pb-3">
              <CardTitle className="line-clamp-1 text-lg">{template.name}</CardTitle>
              <CardDescription className="line-clamp-2">
                {template.description}
              </CardDescription>
            </CardHeader>

            <CardContent className="flex-1 space-y-3 pb-3">
              {/* Usage Count */}
              <div className="rounded-lg bg-muted p-2">
                <p className="text-xs text-muted-foreground">
                  <span className="font-semibold text-foreground">{template.usageCount}</span> teklifte
                  kullanıldı
                </p>
              </div>

              {/* Template Details Preview */}
              <div className="space-y-1 text-xs text-muted-foreground">
                <p>
                  <span className="font-medium">Geçerlilik:</span> {template.defaultValidityDays} gün
                </p>
                <p className="line-clamp-2">
                  <span className="font-medium">Ödeme:</span> {template.defaultPaymentTerms}
                </p>
              </div>
            </CardContent>

            {/* Action Buttons */}
            <div className="border-t bg-muted/30 p-3">
              <div className="flex flex-wrap gap-2">
                <Dialog>
                  <DialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 gap-1"
                      onClick={() => handleOpenDialog(template)}
                    >
                      <Edit2 className="h-4 w-4" />
                      <span className="hidden sm:inline">Düzenle</span>
                    </Button>
                  </DialogTrigger>
                </Dialog>

                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1"
                  onClick={() => handleDuplicateTemplate(template)}
                  title="Şablonu kopyala"
                >
                  <Copy className="h-4 w-4" />
                  <span className="hidden sm:inline">Kopyala</span>
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1"
                  onClick={() => handleDeleteTemplate(template.id)}
                  title="Şablonu sil"
                >
                  <Trash2 className="h-4 w-4" />
                  <span className="hidden sm:inline">Sil</span>
                </Button>

                {!template.isDefault && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 gap-1"
                    onClick={() => handleSetAsDefault(template.id)}
                  >
                    <Star className="h-4 w-4" />
                    <span className="hidden sm:inline">Varsayılan Yap</span>
                  </Button>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Empty State */}
      {templates.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="mb-4 text-muted-foreground">Henüz şablon oluşturulmamıştır</p>
            <Dialog open={openDialog} onOpenChange={setOpenDialog}>
              <DialogTrigger asChild>
                <Button onClick={() => handleOpenDialog()}>Yeni Şablon Oluştur</Button>
              </DialogTrigger>
            </Dialog>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
