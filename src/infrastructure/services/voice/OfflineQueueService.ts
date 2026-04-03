'use client';

import type { VoiceParseResult } from './types';

export interface QueuedVoiceProposal {
  id: string;
  audioData: string;       // base64 audio
  language: string;
  createdAt: number;       // timestamp
  status: 'pending' | 'processing' | 'completed' | 'failed';
  retryCount: number;
  result?: VoiceParseResult;
  error?: string;
}

const DB_NAME = 'teklifpro-voice-queue';
const STORE_NAME = 'proposals';
const DB_VERSION = 1;
const MAX_RETRIES = 3;

export class OfflineQueueService {
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    if (this.db) return;

    return new Promise<void>((resolve, reject) => {
      try {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = () => {
          const db = request.result;
          if (!db.objectStoreNames.contains(STORE_NAME)) {
            db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          }
        };

        request.onsuccess = () => {
          this.db = request.result;
          resolve();
        };

        request.onerror = () => {
          reject(request.error);
        };
      } catch (err) {
        reject(err);
      }
    });
  }

  async enqueue(audioData: string, language: string): Promise<string> {
    await this.ensureDB();

    const item: QueuedVoiceProposal = {
      id: crypto.randomUUID(),
      audioData,
      language,
      createdAt: Date.now(),
      status: 'pending',
      retryCount: 0,
    };

    return new Promise<string>((resolve, reject) => {
      try {
        const tx = this.db!.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const request = store.put(item);

        request.onsuccess = () => resolve(item.id);
        request.onerror = () => reject(request.error);
      } catch (err) {
        reject(err);
      }
    });
  }

  async dequeue(): Promise<QueuedVoiceProposal | null> {
    await this.ensureDB();

    const all = await this.getAll();
    const pending = all
      .filter((item) => item.status === 'pending' && item.retryCount < MAX_RETRIES)
      .sort((a, b) => a.createdAt - b.createdAt);

    return pending[0] || null;
  }

  async updateStatus(
    id: string,
    status: QueuedVoiceProposal['status'],
    result?: VoiceParseResult,
    error?: string,
  ): Promise<void> {
    await this.ensureDB();

    return new Promise<void>((resolve, reject) => {
      try {
        const tx = this.db!.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const getReq = store.get(id);

        getReq.onsuccess = () => {
          const item = getReq.result as QueuedVoiceProposal | undefined;
          if (!item) {
            resolve();
            return;
          }

          item.status = status;
          if (result !== undefined) item.result = result;
          if (error !== undefined) item.error = error;
          if (status === 'failed') item.retryCount += 1;

          const putReq = store.put(item);
          putReq.onsuccess = () => resolve();
          putReq.onerror = () => reject(putReq.error);
        };

        getReq.onerror = () => reject(getReq.error);
      } catch (err) {
        reject(err);
      }
    });
  }

  async getPendingCount(): Promise<number> {
    try {
      const all = await this.getAll();
      return all.filter(
        (item) => item.status === 'pending' && item.retryCount < MAX_RETRIES,
      ).length;
    } catch {
      return 0;
    }
  }

  async getAll(): Promise<QueuedVoiceProposal[]> {
    await this.ensureDB();

    return new Promise<QueuedVoiceProposal[]>((resolve, reject) => {
      try {
        const tx = this.db!.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const request = store.getAll();

        request.onsuccess = () => resolve(request.result ?? []);
        request.onerror = () => reject(request.error);
      } catch (err) {
        reject(err);
      }
    });
  }

  async remove(id: string): Promise<void> {
    await this.ensureDB();

    return new Promise<void>((resolve, reject) => {
      try {
        const tx = this.db!.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const request = store.delete(id);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      } catch (err) {
        reject(err);
      }
    });
  }

  async processQueue(): Promise<void> {
    let item = await this.dequeue();

    while (item) {
      try {
        await this.updateStatus(item.id, 'processing');

        // Step 1: Transcribe
        const transcribeRes = await fetch('/api/v1/proposals/voice-transcribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ audioData: item.audioData, language: item.language }),
        });
        const transcribeData = await transcribeRes.json();

        if (!transcribeData.success || !transcribeData.data?.text) {
          throw new Error(transcribeData.error || 'Transcription failed');
        }

        // Step 2: Parse
        const parseRes = await fetch('/api/v1/proposals/voice-parse', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            transcript: transcribeData.data.text,
            tenantId: '',
            language: item.language,
          }),
        });
        const parseData = await parseRes.json();

        if (!parseData.success || !parseData.data) {
          throw new Error(parseData.error || 'Parse failed');
        }

        await this.updateStatus(item.id, 'completed', parseData.data as VoiceParseResult);
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown error';
        await this.updateStatus(item.id, 'failed', undefined, errorMsg);
      }

      item = await this.dequeue();
    }
  }

  private onlineHandler: (() => void) | null = null;

  startAutoSync(): void {
    this.onlineHandler = () => {
      this.processQueue().catch(() => {
        // Silently handle process queue errors during auto-sync
      });
    };
    window.addEventListener('online', this.onlineHandler);
  }

  stopAutoSync(): void {
    if (this.onlineHandler) {
      window.removeEventListener('online', this.onlineHandler);
      this.onlineHandler = null;
    }
  }

  private async ensureDB(): Promise<void> {
    if (!this.db) {
      await this.init();
    }
  }
}
