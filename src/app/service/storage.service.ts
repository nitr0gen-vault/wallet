import { Injectable } from '@angular/core';
import { GetResult, Storage } from '@capacitor/storage';

interface Settings {
  general: {
    email: string;
    telephone: string;
  };
  security: {
    twofa: boolean;
    freeze: boolean;
  };
  recovery: {
    email: string;
  };
}

@Injectable({
  providedIn: 'root',
})
export class StorageService {
  constructor() {
    (async () => {
      this.settings = (await this.get('settings', {
        general: {
          email: '',
          telephone: '',
        },
        security: {
          twofa: false,
          freeze: false,
        },
        recovery: {
          email: '',
        },
      })) as Settings;
    })();
  }

  private profileObscure(key: string): string {
    return `def.${key}`;
  }

  public async get(key: string, defaultValue?: any): Promise<any> {
    const stored = (await Storage.get({ key: this.profileObscure(key) })).value;
    if (stored) {
      return JSON.parse(stored);
    } else {
      return defaultValue;
    }
  }

  public async set(key: string, value: any): Promise<void> {
    return Storage.set({
      key: this.profileObscure(key),
      value: JSON.stringify(value),
    });
  }

  private _settings: Settings = {
    general: {
      email: '',
      telephone: '',
    },
    security: {
      twofa: false,
      freeze: false,
    },
    recovery: {
      email: '',
    },
  };
  public get settings(): Settings {
    return this._settings;
  }

  public set settings(v: Settings) {
    this._settings = v;
    this.save();
  }

  public async save() {
    this.set('settings', this.settings);
  }

  public async reset() {
    await Storage.clear();
  }
}
