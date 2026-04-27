'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { FileText, Plus } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/shared/components/ui/dialog';
import { Input } from '@/shared/components/ui/input';
import { Card, CardContent } from '@/shared/components/ui/card';
import { Label } from '@/shared/components/ui/label';
import { Textarea } from '@/shared/components/ui/textarea';

export default function TemplatesPage() {
  const t = useTranslations('templates');
  const [openDialog, setOpenDialog] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const handleOpenDialog = () => {
    setName('');
    setDescription('');
    setOpenDialog(true);
  };

  return (
    <div className="space-y-8 p-4 md:p-8">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
          <p className="mt-2 text-sm text-gray-500">
            {t('subtitle')}
          </p>
        </div>
        <Dialog open={openDialog} onOpenChange={setOpenDialog}>
          <DialogTrigger asChild>
            <Button
              onClick={handleOpenDialog}
              className="gap-2 rounded-xl bg-gradient-to-r from-mint-500 to-mint-600 text-white shadow-lg shadow-mint-500/20 transition-all hover:from-mint-600 hover:to-mint-700 hover:shadow-xl hover:shadow-mint-500/30"
            >
              <Plus className="h-4 w-4" />
              {t('create')}
            </Button>
          </DialogTrigger>
          <DialogContent className="w-full max-w-md rounded-2xl">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold">{t('dialogTitle')}</DialogTitle>
              <DialogDescription className="text-gray-500">
                {t('dialogDesc')}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="template-name" className="text-xs font-semibold uppercase text-gray-500">
                  {t('nameLabel')}
                </Label>
                <Input
                  id="template-name"
                  placeholder={t('namePlaceholder')}
                  className="rounded-xl bg-gray-50 transition-colors focus:bg-white dark:bg-gray-900 dark:focus:bg-gray-950"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="template-description" className="text-xs font-semibold uppercase text-gray-500">
                  {t('descLabel')}
                </Label>
                <Textarea
                  id="template-description"
                  placeholder={t('descPlaceholder')}
                  className="min-h-20 rounded-xl bg-gray-50 transition-colors focus:bg-white dark:bg-gray-900 dark:focus:bg-gray-950"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
              <div className="rounded-xl border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 p-4 dark:border-amber-800 dark:from-amber-950/50 dark:to-orange-950/50">
                <p className="text-center text-sm font-medium text-amber-700 dark:text-amber-400">
                  {t('comingSoon')}
                </p>
              </div>
              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  onClick={() => setOpenDialog(false)}
                  className="flex-1 rounded-xl"
                >
                  {t('cancel')}
                </Button>
                <Button
                  disabled
                  className="flex-1 rounded-xl bg-gradient-to-r from-mint-500 to-mint-600 text-white shadow-lg shadow-mint-500/20"
                >
                  {t('createBtn')}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Empty State */}
      <Card className="border-0 shadow-none">
        <CardContent className="flex flex-col items-center justify-center py-20">
          <div className="mb-6 rounded-2xl bg-gradient-to-br from-mint-100 to-mint-100 p-8 dark:from-mint-950 dark:to-mint-950">
            <FileText className="h-12 w-12 text-mint-500" />
          </div>
          <h3 className="mb-3 text-xl font-bold">
            {t('emptyTitle')}
          </h3>
          <p className="mb-8 max-w-md text-center text-sm text-gray-500">
            {t('emptyDesc')}
          </p>
          <Button
            onClick={handleOpenDialog}
            className="gap-2 rounded-xl bg-gradient-to-r from-mint-500 to-mint-600 text-white shadow-lg shadow-mint-500/20 transition-all hover:from-mint-600 hover:to-mint-700 hover:shadow-xl hover:shadow-mint-500/30"
          >
            <Plus className="h-4 w-4" />
            {t('create')}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
