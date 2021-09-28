import { IKey, KeyHandler, KeyType } from '@activeledger/sdk';
import { Component } from '@angular/core';
import { StorageService } from '../service/storage.service';

@Component({
  selector: 'app-tab1',
  templateUrl: 'tab1.page.html',
  styleUrls: ['tab1.page.scss'],
})
export class Tab1Page {
  constructor(private storage: StorageService) {}

  async ngOnInit() {
    let otk = (await this.storage.get('otk')) as IKey;
    if (!otk) {
      // Time to create
      const kh = new KeyHandler();
      otk = await kh.generateKey('otk', KeyType.EllipticCurve);
      await this.storage.set('otk', otk);
    }

    if (!otk.identity) {
      // No Identity, We need to onboard

    }

  }
}
