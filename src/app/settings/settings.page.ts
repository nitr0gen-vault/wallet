import {
  BarcodeScanner,
  SupportedFormat,
} from '@capacitor-community/barcode-scanner';
import { Component, OnInit } from '@angular/core';
import { App } from '@capacitor/app';
import { LoadingController, Platform } from '@ionic/angular';
import { AlertController } from '@ionic/angular';
import { StorageService } from '../service/storage.service';
import { environment } from '../../environments/environment';
import { OtkService, Wallet } from '../service/otk.service';
import { Device } from '@capacitor/device';
import { Keyboard } from '@capacitor/keyboard';
import { ClipboardService } from 'ngx-clipboard';
import { Nitr0genApiService } from '../service/nitr0gen-api.service';
import { lastValueFrom } from 'rxjs/internal/lastValueFrom';

@Component({
  selector: 'app-settings',
  templateUrl: 'settings.page.html',
  styleUrls: ['settings.page.scss'],
})
export class SettingsPage implements OnInit {
  version = environment.version;
  uuid: string;
  pairCode: string;

  constructor(
    private alertController: AlertController,
    public storage: StorageService,
    private otk: OtkService,
    private platform: Platform,
    private clippy: ClipboardService,
    private nitr0gen: Nitr0genApiService,
    private loadingControler: LoadingController
  ) {}

  async ngOnInit() {
    this.uuid = (await Device.getId()).uuid;

    const closeElement = document.getElementById('closeBarcode');
    closeElement.onclick = () => {
      if (BarcodeScanner) {
        const angularElement = document.getElementById('angular');
        const barcodeElement = document.getElementById('barcode');
        BarcodeScanner.showBackground();
        BarcodeScanner.stopScan();
        barcodeElement.style.display = 'none';
        angularElement.style.display = 'block';
        // document.body.style.background = '';
        document.body.style.opacity = '1';
      }
    };
  }

  public copyCode() {
    this.clippy.copy(this.uuid);
  }

  public async blurSave(type: string) {
    switch (type) {
      case 'security':
        this.otk.updateIdentity('security', {
          twoFA: this.storage.settings.security.twofa,
          freeze: this.storage.settings.security.freeze,
        });
        break;
      case 'recovery':
        this.otk.updateIdentity(
          'recovery',
          this.storage.settings.recovery.email
        );
        break;
      case 'email':
        await this.otk.updateIdentity(
          'email',
          this.storage.settings.general.email
        );
        break;
      case 'telephone':
        this.otk.updateIdentity(
          'telephone',
          this.storage.settings.general.telephone
        );
        break;
    }
    this.storage.save();
  }

  private loading: HTMLIonLoadingElement;
  public async socialRecovery() {
    this.loading = await this.loadingControler.create();
    const alert = await this.alertController.create({
      header: 'Start Social Recovery',
      message:
        'In your email inbox you will have your unique ID code of the account you want to recover',
      inputs: [
        {
          name: 'uuid',
          label: 'Enter Unique ID',
        },
      ],
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel',
        },
        {
          text: 'Confirm',
          handler: async (c) => {
            // Fetch uuid
            const nId = (await lastValueFrom(
              this.nitr0gen.uuid(c.uuid)
            )) as any;

            if (nId.nId) {
              this.loading.message = 'Checking Recovery Options';
              await this.loading.present();

              const results = await lastValueFrom(
                this.nitr0gen.recovery(
                  await this.otk.recoveryPreflight(nId.nId)
                )
              );
              console.log(results);
              this.loading.hidden = true;

              // has no errors check

              const alert = await this.alertController.create({
                header: 'Recovery Codes',
                message: `You and your social have been emailed codes`,
                inputs: [
                  {
                    name: 'yourCode',
                    label: 'Your Code',
                    placeholder: 'Enter your code',
                  },
                  {
                    name: 'socialCode',
                    label: 'Social Code',
                    placeholder: 'Enter friends code',
                  },
                ],
                buttons: [
                  {
                    text: 'Cancel',
                    role: 'cancel',
                  },
                  {
                    text: 'Confirm',
                    handler: async (a: {
                      yourCode: string;
                      socialCode: string;
                    }) => {
                      this.loading.message = 'Validating Codes';
                      this.loading.hidden = false;
                      const results = (await lastValueFrom(
                        this.nitr0gen.recovery(
                          await this.otk.recoveryPreValidate(
                            nId.nId,
                            a.yourCode,
                            a.socialCode
                          )
                        )
                      )) as any;
                      console.log(results);

                      if (await this.noErrors(results)) {
                        // Maybe need to "filter" the retuns from the api
                        if (results?.$streams?.updated[0].id == nId.nId) {
                          this.loading.message = 'Refreshing Wallets';
                          this.otk.forceKeyIdentity(nId.nId);

                          // get wallets from api
                          const cache = await this.nitr0gen.wallet.cache(
                            c.uuid
                          );
                          const tmpWallets: Wallet[] = [];

                          // We are now on a different uuid (possibly)
                          // Do we need to add them on the api side onto the new uuid
                          // Duplicates doesn't matter as its the signing side that protects everything

                          if (cache.keys) {
                            for (let i = 0; i < cache.keys.length; i++) {
                              const wallet = cache.keys[i];
                              tmpWallets.push({
                                address: wallet.address,
                                symbol: wallet.symbol,
                                chainId: wallet.chainId,
                                nId: wallet.nId,
                                nonce: 0,
                                hashes: wallet.hashes,
                                tokens: wallet.tokens,
                              });
                            }
                            await this.otk.recacheWallets(tmpWallets);
                            console.log('Wallet Recached');

                            // settings
                            this.storage.settings.general.email =
                              cache.settings.email;
                            this.storage.settings.recovery =
                              cache.settings.recovery;
                            this.storage.settings.security =
                              cache.settings.security;
                            this.storage.settings.general.telephone =
                              cache.settings.telephone;

                            await this.storage.save();
                            this.restart();
                          }
                        }
                        this.loading.dismiss();
                      } else {
                        this.loading.dismiss();
                      }
                    },
                  },
                ],
              });

              await alert.present();
            } else {
              const alert = await this.alertController.create({
                header: 'Unknown Unique Id',
                message: `${c.uuid} was not found`,
              });
              await alert.present();
            }
          },
        },
      ],
    });
    await alert.present();
  }

  private async noErrors(response: any): Promise<boolean> {
    if (response.$summary?.errors) {
      await this.loading.dismiss();
      const alert = await this.alertController.create({
        header: 'Request Error',
        message: response.$summary?.errors[0]
          .match(/(?:"[^"]*"|^[^"]*$)/)[0]
          .replace(/"/g, ''),
      });
      await alert.present();
      return false;
    }
    return true;
  }

  public async reset() {
    await this.storage.reset();
    this.restart();
  }

  public restart() {
    if (this.platform.is('mobileweb')) {
      window.location.href = '/';
    } else {
      App.exitApp();
    }
  }

  public async unhide() {
    const wallets = await this.otk.getWallets();
    wallets.forEach((wallet) => {
      wallet.hidden = false;
      wallet.tokens?.forEach((token) => {
        token.hidden = false;
      });
    });
    await this.otk.setWallets();
  }

  public canScan() {
    return !this.platform.is('mobileweb');
  }

  public async scanner() {
    Keyboard.hide(); // iOS launches keyboard, Pair Code gets focus.
    const status = await BarcodeScanner.checkPermission({ force: true });
    // const status = {
    //   granted: true,
    // };

    if (status.granted) {
      const angularElement = document.getElementById('angular');
      const barcodeElement = document.getElementById('barcode');

      BarcodeScanner.hideBackground();
      // document.body.style.opacity = '0.2';
      document.body.style.background = 'transparent';
      angularElement.style.display = 'none';
      barcodeElement.style.display = 'flex';
      const result = await BarcodeScanner.startScan({
        targetedFormats: [SupportedFormat.QR_CODE],
      });

      // if the result has content
      if (result.hasContent) {
        barcodeElement.style.display = 'none';
        angularElement.style.display = 'block';
        // document.body.style.background = '';
        document.body.style.opacity = '1';
        this.pairCode = result.content;
      }
    }
  }

  async pairWarning() {
    if (this.pairCode) {
      const alert = await this.alertController.create({
        header: 'Confirmation',
        message: 'The device that you scan will gain access to yours.',
        buttons: [
          {
            text: 'Cancel',
            role: 'cancel',
          },
          {
            text: 'Confirm',
            handler: async () => {
              const response = (await lastValueFrom(
                this.nitr0gen.otpk(this.pairCode)
              )) as any;

              if (response.otpk) {
                const result = await this.otk.pair(
                  this.pairCode,
                  response.otpk
                );
                console.log(result);
                const alert = await this.alertController.create({
                  header: 'Pair Complete',
                  message: 'New device can now change profile to this wallet.',
                });
                await alert.present();
              }
            },
          },
        ],
      });

      await alert.present();
    }
  }
}
