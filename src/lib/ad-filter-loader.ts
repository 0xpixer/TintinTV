/* eslint-disable @typescript-eslint/no-explicit-any */
import Hls from 'hls.js';

import { filterVodAds } from '@/lib/ad-filter';

// Used only when a source rejects server-side playlist requests.
export class AdFilterLoader extends Hls.DefaultConfig.loader {
  constructor(config: any) {
    super(config);
    const load = this.load.bind(this);
    this.load = (context: any, options: any, callbacks: any) => {
      if (context.type === 'manifest' || context.type === 'level') {
        const onSuccess = callbacks.onSuccess;
        callbacks = {
          ...callbacks,
          onSuccess(response: any, ...rest: any[]) {
            if (typeof response.data === 'string') {
              response = { ...response, data: filterVodAds(response.data) };
            }
            onSuccess(response, ...rest);
          },
        };
      }
      load(context, options, callbacks);
    };
  }
}
