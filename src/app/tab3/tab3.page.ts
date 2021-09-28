import { Component, OnInit } from '@angular/core';
import { App } from '@capacitor/app';
import { Platform } from '@ionic/angular';
import { AlertController } from '@ionic/angular';
import { StorageService } from '../service/storage.service';
import { environment } from '../../environments/environment';
import { OtkService } from '../service/otk.service';
import { Device } from '@capacitor/device';

@Component({
  selector: 'app-tab3',
  templateUrl: 'tab3.page.html',
  styleUrls: ['tab3.page.scss'],
})
export class Tab3Page implements OnInit{
  version = environment.version;
  uuid: string;
  constructor(
    private alertController: AlertController,
    private storage: StorageService,
    private otk: OtkService,
    private platform: Platform
  ) {}

  async ngOnInit() {
    this.uuid = (await Device.getId()).uuid
  }

  public async reset() {
    await this.storage.reset();
    if (this.platform.is('mobileweb')) {
      window.location.href = '/';
    } else {
      App.exitApp();
    }
  }

  public async unhide() {
    const wallets = await this.otk.getWallets();
    wallets.forEach(wallet => {
      wallet.tokens?.forEach(token => {
        token.hidden = false;
      })
    });
    await this.otk.setWallets();
  }

  async pairWarning() {
    const alert = await this.alertController.create({
      header: 'Confirmation',
      message:
        'The device that you scan will lose access to its current wallets and gain access to yours.',
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel',
        },
        {
          text: 'Confirm',
          handler: () => {
            console.log('Confirm Okay');
          },
        },
      ],
    });

    await alert.present();
  }
}
