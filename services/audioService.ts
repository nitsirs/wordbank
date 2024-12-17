class AudioQueue {
  private queue: Map<string, HTMLAudioElement> = new Map();
  private maxQueueSize: number = 5;
  private cacheName: string = 'audio-cache-v1';
  private defaultMaxEntries: number = 30;

  private async getCacheStorage(): Promise<Cache> {
    if (typeof caches === 'undefined') {
      throw new Error('Cache API not supported');
    }
    return await caches.open(this.cacheName);
  }

  private getOptimalCacheSize(): number {
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    
    if (isMobile) {
      return 20;
    }
    
    return this.defaultMaxEntries;
  }

  private async shouldCache(): Promise<boolean> {
    try {
      if ('storage' in navigator && 'estimate' in navigator.storage) {
        const estimate = await navigator.storage.estimate();
        const percentageUsed = (estimate.usage || 0) / (estimate.quota || 1) * 100;
        
        if (percentageUsed > 80) {
          console.warn('Storage usage high, limiting cache');
          return false;
        }
      }
      
      const currentSize = await this.getCacheSize();
      return currentSize < this.getOptimalCacheSize();
    } catch (error) {
      console.error('Error checking storage:', error);
      return true;
    }
  }

  async preload(word: string): Promise<void> {
    try {
      const cache = await this.getCacheStorage();
      const audioUrl = `/audio/trimmed/word_${word}.mp3`;
      
      const cachedResponse = await cache.match(audioUrl);
      if (!cachedResponse) {
        const shouldCacheMore = await this.shouldCache();
        
        const response = await fetch(audioUrl);
        if (!response.ok) throw new Error('Network response was not ok');
        
        if (shouldCacheMore) {
          await cache.put(audioUrl, response.clone());
        }
      }

      if (this.queue.size >= this.maxQueueSize) {
        const firstKey = this.queue.keys().next().value;
        this.queue.delete(firstKey);
      }

      const audio = new Audio(audioUrl);
      audio.load();
      this.queue.set(word, audio);
    } catch (error) {
      console.error('Error preloading audio:', error);
    }
  }

  async play(word: string): Promise<void> {
    return new Promise(async (resolve, reject) => {
      try {
        const audioUrl = `/audio/trimmed/word_${word}.mp3`;
        let audio = this.queue.get(word);

        if (!audio) {
          const cache = await this.getCacheStorage();
          const cachedResponse = await cache.match(audioUrl);
          
          if (cachedResponse) {
            audio = new Audio(audioUrl);
          } else {
            const response = await fetch(audioUrl);
            if (!response.ok) throw new Error('Network response was not ok');
            
            const cache = await this.getCacheStorage();
            await cache.put(audioUrl, response.clone());
            
            audio = new Audio(audioUrl);
          }
        }

        audio.play()
          .then(() => {
            audio!.onended = () => {
              this.queue.delete(word);
              resolve();
            };
          })
          .catch(reject);
      } catch (error) {
        console.error('Error playing audio:', error);
        reject(error);
      }
    });
  }

  async clear(): Promise<void> {
    this.queue.forEach(audio => {
      audio.pause();
      audio.src = '';
    });
    this.queue.clear();

    try {
      const cache = await this.getCacheStorage();
      const keys = await cache.keys();
      await Promise.all(keys.map(key => cache.delete(key)));
    } catch (error) {
      console.error('Error clearing cache:', error);
    }
  }

  async getCacheSize(): Promise<number> {
    try {
      const cache = await this.getCacheStorage();
      const keys = await cache.keys();
      return keys.length;
    } catch (error) {
      console.error('Error getting cache size:', error);
      return 0;
    }
  }

  async clearOldCache(): Promise<void> {
    try {
      const cache = await this.getCacheStorage();
      const keys = await cache.keys();
      const maxEntries = this.getOptimalCacheSize();
      
      if (keys.length > maxEntries) {
        const entriesToDelete = keys.slice(0, keys.length - maxEntries);
        await Promise.all(entriesToDelete.map(key => cache.delete(key)));
        console.log(`Cleared ${entriesToDelete.length} old cache entries`);
      }
    } catch (error) {
      console.error('Error clearing old cache:', error);
    }
  }
}

const audioQueue = new AudioQueue();

export default audioQueue;