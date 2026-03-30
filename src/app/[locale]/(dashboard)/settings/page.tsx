'use client';

import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, CheckCircle2, Upload, Eye, EyeOff, Plus, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'editor' | 'viewer';
  lastLogin: Date;
}

interface BillingHistoryItem {
  id: string;
  date: Date;
  plan: string;
  amount: number;
  status: 'paid' | 'pending' | 'failed';
}

const SettingsPage = () => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('general');
  const [loading, setLoading] = useState(false);
  const [showPasswords, setShowPasswords] = useState({
    parasutPassword: false,
    parasutClientSecret: false,
  });

  const [general, setGeneral] = useState({
    companyName: 'Acme Corporation',
    email: 'contact@acme.com',
    phone: '+90 212 XXX XXXX',
    address: 'İstanbul, Turkey',
    taxNumber: '0123456789',
    taxOffice: 'Beyoğlu Tax Office',
  });

  const [parasut, setParasut] = useState({
    connected: true,
    companyId: 'COMP-123456',
    clientId: 'CLIENT-ABC123',
    clientSecret: 'secret_xxxxxxxxxxxx',
    username: 'parasut_user',
    password: 'password_xxxx',
    lastSync: new Date(Date.now() - 2 * 60 * 60 * 1000),
  });

  const [whatsapp, setWhatsapp] = useState({
    phoneNumberId: '1234567890123',
    accessToken: 'EAABsxxxxxxxxxxxxxxxxxx',
    businessAccountId: '9876543210123',
    status: 'connected',
  });

  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([
    {
      id: '1',
      name: 'John Doe',
      email: 'john@acme.com',
      role: 'admin',
      lastLogin: new Date(Date.now() - 1 * 60 * 60 * 1000),
    },
    {
      id: '2',
      name: 'Jane Smith',
      email: 'jane@acme.com',
      role: 'editor',
      lastLogin: new Date(Date.now() - 24 * 60 * 60 * 1000),
    },
  ]);

  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'editor' | 'viewer'>('editor');

  const [subscription, setSubscription] = useState({
    currentPlan: 'Professional',
    usedQuotes: 34,
    maxQuotes: 100,
    nextBillingDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
  });

  const billingHistory: BillingHistoryItem[] = [
    {
      id: '1',
      date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      plan: 'Professional',
      amount: 99,
      status: 'paid',
    },
    {
      id: '2',
      date: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
      plan: 'Professional',
      amount: 99,
      status: 'paid',
    },
  ];

  const roleDescriptions = {
    admin: 'Full access to all settings and team management',
    editor: 'Can create and edit proposals',
    viewer: 'Can only view proposals',
  };

  const handleGeneralSave = async () => {
    setLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast({
        title: 'Başarılı',
        description: 'Genel ayarlar kaydedildi.',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleParasutTest = async () => {
    setLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      toast({
        title: 'Bağlantı Başarılı',
        description: 'Paraşüt bağlantısı test edildi.',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleParasutSync = async () => {
    setLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      toast({
        title: 'Senkronizasyon Başarılı',
        description: 'Verileri başarıyla senkronize ettik.',
      });
      setParasut({ ...parasut, lastSync: new Date() });
    } finally {
      setLoading(false);
    }
  };

  const handleParasutDisconnect = async () => {
    if (confirm('Paraşüt bağlantısını keseceğinizden emin misiniz?')) {
      setLoading(true);
      try {
        await new Promise(resolve => setTimeout(resolve, 1000));
        setParasut({ ...parasut, connected: false });
        toast({
          title: 'Bağlantı Kesildi',
          description: 'Paraşüt bağlantınız kesildi.',
        });
      } finally {
        setLoading(false);
      }
    }
  };

  const handleWhatsAppTest = async () => {
    setLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      toast({
        title: 'Test Mesajı Gönderildi',
        description: 'WhatsApp test mesajı başarıyla gönderildi.',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInviteUser = async () => {
    if (!inviteEmail) {
      toast({
        title: 'Hata',
        description: 'Lütfen bir e-posta adresi girin.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast({
        title: 'Davet Gönderildi',
        description: `${inviteEmail} adresine davet gönderildi.`,
      });
      setInviteEmail('');
      setInviteRole('editor');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveTeamMember = async (id: string) => {
    if (confirm('Bu kullanıcıyı takımdan çıkarmak istediğinizden emin misiniz?')) {
      setTeamMembers(teamMembers.filter(m => m.id !== id));
      toast({
        title: 'Başarılı',
        description: 'Kullanıcı takımdan çıkarıldı.',
      });
    }
  };

  const formatLastSync = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins} dakika önce`;
    if (diffHours < 24) return `${diffHours} saat önce`;
    return `${diffDays} gün önce`;
  };

  const togglePasswordVisibility = (field: keyof typeof showPasswords) => {
    setShowPasswords(prev => ({
      ...prev,
      [field]: !prev[field],
    }));
  };

  return (
    <div className="w-full max-w-6xl mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Ayarlar</h1>
        <p className="text-muted-foreground mt-2">
          Hesap, entegrasyonlar ve abonelik ayarlarınızı yönetin
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5 mb-8">
          <TabsTrigger value="general">Genel</TabsTrigger>
          <TabsTrigger value="parasut">Paraşüt</TabsTrigger>
          <TabsTrigger value="whatsapp">WhatsApp</TabsTrigger>
          <TabsTrigger value="team">Ekip</TabsTrigger>
          <TabsTrigger value="subscription">Abonelik</TabsTrigger>
        </TabsList>

        {/* General Tab */}
        <TabsContent value="general" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Şirket Bilgileri</CardTitle>
              <CardDescription>Temel şirket bilgilerinizi güncelleyin</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="company-name">Şirket Adı</Label>
                  <Input
                    id="company-name"
                    value={general.companyName}
                    onChange={e => setGeneral({ ...general, companyName: e.target.value })}
                    placeholder="Şirket adınızı girin"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">E-posta</Label>
                  <Input
                    id="email"
                    type="email"
                    value={general.email}
                    onChange={e => setGeneral({ ...general, email: e.target.value })}
                    placeholder="contact@example.com"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="phone">Telefon</Label>
                  <Input
                    id="phone"
                    value={general.phone}
                    onChange={e => setGeneral({ ...general, phone: e.target.value })}
                    placeholder="+90 XXX XXX XXXX"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tax-number">Vergi Numarası</Label>
                  <Input
                    id="tax-number"
                    value={general.taxNumber}
                    onChange={e => setGeneral({ ...general, taxNumber: e.target.value })}
                    placeholder="0123456789"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Adres</Label>
                <Input
                  id="address"
                  value={general.address}
                  onChange={e => setGeneral({ ...general, address: e.target.value })}
                  placeholder="Şirket adresiniz"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tax-office">Vergi Dairesi</Label>
                <Input
                  id="tax-office"
                  value={general.taxOffice}
                  onChange={e => setGeneral({ ...general, taxOffice: e.target.value })}
                  placeholder="Vergi daireniz"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="logo">Logo</Label>
                <div className="flex items-center gap-4">
                  <Button variant="outline" className="gap-2">
                    <Upload className="w-4 h-4" />
                    Logo Yükle
                  </Button>
                  <p className="text-sm text-muted-foreground">PNG, JPG - Maksimum 2MB</p>
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <Button onClick={handleGeneralSave} disabled={loading}>
                  Değişiklikleri Kaydet
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Parasut Tab */}
        <TabsContent value="parasut" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Paraşüt Entegrasyonu</span>
                <Badge variant={parasut.connected ? 'default' : 'secondary'}>
                  {parasut.connected ? 'Bağlı' : 'Bağlı Değil'}
                </Badge>
              </CardTitle>
              <CardDescription>Paraşüt muhasebe sisteminizi TeklifPro ile entegre edin</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {parasut.connected && (
                <Alert>
                  <CheckCircle2 className="h-4 w-4" />
                  <AlertDescription>
                    Paraşüt bağlantınız aktif. Son senkronizasyon: {formatLastSync(parasut.lastSync)}
                  </AlertDescription>
                </Alert>
              )}

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="company-id">Şirket ID</Label>
                  <Input
                    id="company-id"
                    value={parasut.companyId}
                    onChange={e => setParasut({ ...parasut, companyId: e.target.value })}
                    disabled={parasut.connected}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="client-id">Client ID</Label>
                  <Input
                    id="client-id"
                    value={parasut.clientId}
                    onChange={e => setParasut({ ...parasut, clientId: e.target.value })}
                    disabled={parasut.connected}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="client-secret">Client Secret</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="client-secret"
                    type={showPasswords.parasutClientSecret ? 'text' : 'password'}
                    value={parasut.clientSecret}
                    onChange={e => setParasut({ ...parasut, clientSecret: e.target.value })}
                    disabled={parasut.connected}
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => togglePasswordVisibility('parasutClientSecret')}
                  >
                    {showPasswords.parasutClientSecret ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="username">Kullanıcı Adı</Label>
                  <Input
                    id="username"
                    value={parasut.username}
                    onChange={e => setParasut({ ...parasut, username: e.target.value })}
                    disabled={parasut.connected}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Şifre</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="password"
                      type={showPasswords.parasutPassword ? 'text' : 'password'}
                      value={parasut.password}
                      onChange={e => setParasut({ ...parasut, password: e.target.value })}
                      disabled={parasut.connected}
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => togglePasswordVisibility('parasutPassword')}
                    >
                      {showPasswords.parasutPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <p className="mb-2 font-medium">Paraşüt kimlik bilgilerinizi nerede bulacağınızı öğrenin:</p>
                  <ul className="text-sm space-y-1">
                    <li>
                      <a href="#" className="underline hover:no-underline text-blue-600">
                        API Bilgileri
                      </a>
                    </li>
                    <li>
                      <a href="#" className="underline hover:no-underline text-blue-600">
                        OAuth Ayarları
                      </a>
                    </li>
                  </ul>
                </AlertDescription>
              </Alert>

              <div className="flex gap-3 pt-4">
                <Button onClick={handleParasutTest} disabled={loading || !parasut.connected} variant="outline">
                  Bağlantıyı Test Et
                </Button>
                <Button onClick={handleParasutSync} disabled={loading || !parasut.connected} variant="outline">
                  Senkronize Et
                </Button>
                {parasut.connected && (
                  <Button onClick={handleParasutDisconnect} disabled={loading} variant="destructive">
                    Bağlantıyı Kes
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* WhatsApp Tab */}
        <TabsContent value="whatsapp" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>WhatsApp Entegrasyonu</span>
                <Badge variant={whatsapp.status === 'connected' ? 'default' : 'secondary'}>
                  {whatsapp.status === 'connected' ? 'Bağlı' : 'Bağlı Değil'}
                </Badge>
              </CardTitle>
              <CardDescription>WhatsApp Business API'yi TeklifPro ile entegre edin</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="phone-number-id">Telefon Numarası ID</Label>
                <Input
                  id="phone-number-id"
                  value={whatsapp.phoneNumberId}
                  onChange={e => setWhatsapp({ ...whatsapp, phoneNumberId: e.target.value })}
                  placeholder="1234567890123"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="access-token">Access Token</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="access-token"
                    type="password"
                    value={whatsapp.accessToken}
                    onChange={e => setWhatsapp({ ...whatsapp, accessToken: e.target.value })}
                    placeholder="EAABsxxxxxxxxxxxxxxxxxx"
                  />
                  <Button variant="ghost" size="sm">
                    <Eye className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="business-account-id">Business Account ID</Label>
                <Input
                  id="business-account-id"
                  value={whatsapp.businessAccountId}
                  onChange={e => setWhatsapp({ ...whatsapp, businessAccountId: e.target.value })}
                  placeholder="9876543210123"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <Button onClick={handleWhatsAppTest} disabled={loading} variant="outline">
                  Test Mesaj Gönder
                </Button>
                <Button onClick={handleGeneralSave} disabled={loading}>
                  Değişiklikleri Kaydet
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Team Tab */}
        <TabsContent value="team" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Kullanıcı Davet Et</CardTitle>
              <CardDescription>Ekibinize yeni üyeler ekleyin</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2 space-y-2">
                  <Label htmlFor="invite-email">E-posta Adresi</Label>
                  <Input
                    id="invite-email"
                    type="email"
                    value={inviteEmail}
                    onChange={e => setInviteEmail(e.target.value)}
                    placeholder="user@example.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="invite-role">Rol</Label>
                  <Select value={inviteRole} onValueChange={e => setInviteRole(e as any)}>
                    <SelectTrigger id="invite-role">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Yönetici</SelectItem>
                      <SelectItem value="editor">Editör</SelectItem>
                      <SelectItem value="viewer">Görüntüleyici</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">{roleDescriptions[inviteRole]}</p>
              <div className="flex justify-end">
                <Button onClick={handleInviteUser} disabled={loading || !inviteEmail} className="gap-2">
                  <Plus className="w-4 h-4" />
                  Davet Gönder
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Ekip Üyeleri</CardTitle>
              <CardDescription>{teamMembers.length} aktif üye</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {teamMembers.map(member => (
                  <div key={member.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium">{member.name}</p>
                      <p className="text-sm text-muted-foreground">{member.email}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <Badge variant="outline">
                        {member.role === 'admin' && 'Yönetici'}
                        {member.role === 'editor' && 'Editör'}
                        {member.role === 'viewer' && 'Görüntüleyici'}
                      </Badge>
                      <p className="text-sm text-muted-foreground w-24 text-right">
                        {formatLastSync(member.lastLogin)}
                      </p>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveTeamMember(member.id)}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Subscription Tab */}
        <TabsContent value="subscription" className="space-y-6">
          <Card className="border-2 border-primary">
            <CardHeader>
              <CardTitle>Mevcut Plan</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="text-2xl font-bold mb-2">{subscription.currentPlan}</h3>
                <p className="text-muted-foreground">
                  Aylık ödeme - Sonraki fatura: {subscription.nextBillingDate.toLocaleDateString('tr-TR')}
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between mb-2">
                  <span className="font-medium">{subscription.usedQuotes}/{subscription.maxQuotes} teklif kullanıldı</span>
                  <span className="text-sm text-muted-foreground">
                    {Math.round((subscription.usedQuotes / subscription.maxQuotes) * 100)}%
                  </span>
                </div>
                <div className="w-full bg-secondary rounded-full h-2">
                  <div
                    className="bg-primary h-2 rounded-full transition-all"
                    style={{
                      width: `${(subscription.usedQuotes / subscription.maxQuotes) * 100}%`,
                    }}
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <Button>Planı Yükselt</Button>
                <Button variant="outline">Planı Değiştir</Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Plan Karşılaştırması</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 font-medium">Özellik</th>
                      <th className="text-left py-3 px-4 font-medium">Starter</th>
                      <th className="text-left py-3 px-4 font-medium">Professional</th>
                      <th className="text-left py-3 px-4 font-medium">Enterprise</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b">
                      <td className="py-3 px-4">Teklif Sayısı</td>
                      <td className="py-3 px-4">50/ay</td>
                      <td className="py-3 px-4 font-bold">100/ay</td>
                      <td className="py-3 px-4">Sınırsız</td>
                    </tr>
                    <tr className="border-b">
                      <td className="py-3 px-4">Ekip Üyeleri</td>
                      <td className="py-3 px-4">1</td>
                      <td className="py-3 px-4 font-bold">5</td>
                      <td className="py-3 px-4">Sınırsız</td>
                    </tr>
                    <tr className="border-b">
                      <td className="py-3 px-4">Paraşüt Entegrasyonu</td>
                      <td className="py-3 px-4">-</td>
                      <td className="py-3 px-4 font-bold">✓</td>
                      <td className="py-3 px-4">✓</td>
                    </tr>
                    <tr>
                      <td className="py-3 px-4">WhatsApp Entegrasyonu</td>
                      <td className="py-3 px-4">-</td>
                      <td className="py-3 px-4 font-bold">✓</td>
                      <td className="py-3 px-4">✓</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Ödeme Geçmişi</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {billingHistory.map(item => (
                  <div key={item.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <p className="font-medium">{item.plan} - ₺{item.amount}</p>
                      <p className="text-sm text-muted-foreground">{item.date.toLocaleDateString('tr-TR')}</p>
                    </div>
                    <Badge variant={item.status === 'paid' ? 'default' : 'secondary'}>
                      {item.status === 'paid' && 'Ödendi'}
                      {item.status === 'pending' && 'Beklemede'}
                      {item.status === 'failed' && 'Başarısız'}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SettingsPage;
