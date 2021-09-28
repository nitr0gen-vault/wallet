import { Injectable } from '@angular/core';
import { GetResult, Storage } from '@capacitor/storage';

@Injectable({
  providedIn: 'root',
})
export class StorageService {
  constructor() {}

  private profileObscure(key: string): string {
    return `def.${key}`;
  }

  public async get(key: string): Promise<any> {
    return JSON.parse(
      (await Storage.get({ key: this.profileObscure(key) })).value
    );
  }

  public async set(key: string, value: any): Promise<void> {
    return Storage.set({
      key: this.profileObscure(key),
      value: JSON.stringify(value),
    });
  }
}
