import {
  BarcodeScanner,
  SupportedFormat,
} from '@capacitor-community/barcode-scanner';
import { Component, OnInit } from '@angular/core';
import { LoadingController, Platform } from '@ionic/angular';
import { AlertController } from '@ionic/angular';
import { Settings, StorageService } from '../service/storage.service';
import { environment } from '../../environments/environment';
import { OtkService, Wallet } from '../service/otk.service';
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
  production = environment.production;
  uuid: string;
  pairCode: string;
  noEmail = true;

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
    this.uuid = await this.otk.getDeviceUuid();
    if(this.storage.settings.general.email) {
      this.noEmail = false;
    }
  }

  public copyCode() {
    this.clippy.copy(this.uuid);
  }

  // Need to improve this method make it more re-usable
  public async blurSave(type: string) {
    let code: string | null;
    let response;

    // So we don't overwrite on blur
    if (this.isSaving) {
      return;
    }
    this.isSaving = true;

    //const storedSettings = this.storage.get("settings") as unknown as Settings;
    switch (type) {
      case 'security':
        this.loading = await this.loadingControler.create({
          message: 'Saving...',
        });
        await this.loading.present();
        response = await this.otk.updateIdentityPreflight('security', {
          twoFA: this.storage.settings.security.twofa,
          freeze: this.storage.settings.security.freeze,
        });
        await this.loading.dismiss();
        if (await this.noErrors(response)) {
          // We know we need the code!
          code = await this.genericFACheck();
          if (code) {
            // Run the save
            response = await this.otk.updateIdentitySave(
              'security',
              {
                twoFA: this.storage.settings.security.twofa,
                freeze: this.storage.settings.security.freeze,
              },
              code
            );
            if (await this.noErrors(response)) {
              this.storage.save();
            } else {
              this.resetSettings();
            }
          }
        } else {
          this.resetSettings();
        }

        this.isSaving = false;
        break;
      case 'recovery':
        if (
          !this.storage.settings.recovery.email ||
          !(await this.isDifferent(type, this.storage.settings.recovery.email))
        ) {
          // cannot be null
          this.resetSettings();
          return;
        }
        this.loading = await this.loadingControler.create({
          message: 'Saving...',
        });
        await this.loading.present();
        response = await this.otk.updateIdentityPreflight(
          'recovery',
          this.storage.settings.recovery.email
        );
        await this.loading.dismiss();
        if (await this.noErrors(response)) {
          // We know we need the code!
          code = await this.genericFACheck();
          if (code) {
            // Run the save
            response = await this.otk.updateIdentitySave(
              'recovery',
              this.storage.settings.recovery.email,
              code
            );
            if (await this.noErrors(response)) {
              this.storage.save();
            } else {
              this.resetSettings();
            }
          }
        } else {
          this.resetSettings();
        }

        this.isSaving = false;
        break;
      case 'email':
        if (
          !this.storage.settings.general.email ||
          !(await this.isDifferent(type, this.storage.settings.general.email))
        ) {
          // cannot be null
          this.resetSettings();
          return;
        }
        this.loading = await this.loadingControler.create({
          message: 'Saving...',
        });
        await this.loading.present();
        response = await this.otk.updateIdentityPreflight(
          'email',
          this.storage.settings.general.email
        );
        await this.loading.dismiss();
        if (await this.noErrors(response)) {
          // We know we need the code!
          code = await this.genericFACheck();
          if (code) {
            // Run the save
            response = await this.otk.updateIdentitySave(
              'email',
              this.storage.settings.general.email,
              code
            );
            if (await this.noErrors(response)) {
              this.noEmail = false;
              this.storage.save();
            } else {
              this.resetSettings();
            }
          }
        } else {
          this.resetSettings();
        }

        this.isSaving = false;
        break;
      case 'telephone':
        if (
          !this.storage.settings.general.telephone ||
          !(await this.isDifferent(
            type,
            this.storage.settings.general.telephone
          ))
        ) {
          // cannot be null
          this.resetSettings();
          return;
        }
        this.loading = await this.loadingControler.create({
          message: 'Saving...',
        });
        await this.loading.present();
        response = await this.otk.updateIdentityPreflight(
          'telephone',
          this.storage.settings.general.telephone
        );
        await this.loading.dismiss();
        if (await this.noErrors(response)) {
          // We know we need the code!
          code = await this.genericFACheck();
          if (code) {
            // Run the save
            response = await this.otk.updateIdentitySave(
              'telephone',
              this.storage.settings.general.telephone,
              code
            );
            if (await this.noErrors(response)) {
              this.storage.save();
            } else {
              this.resetSettings();
            }
          }
        } else {
          this.resetSettings();
        }
        this.isSaving = false;
        break;
    }
  }

  private async isDifferent(type: string, value: string): Promise<boolean> {
    const old = (await this.storage.get('settings')) as Settings;
    switch (type) {
      case 'email':
        return old.general.email !== value;
      case 'telephone':
        return old.general.telephone !== value;
      case 'recovery':
        return old.recovery.email !== value;
    }
  }

  private async resetSettings() {
    // Need to reset the value
    this.storage.settings = (await this.storage.get(
      'settings'
    )) as unknown as Settings;
    this.isSaving = false;
  }

  public isSaving = false;
  private genericFACheck(): Promise<string | null> {
    return new Promise(async (resolve, reject) => {
      const alert = await this.alertController.create({
        header: 'Confirm 2FA',
        message: `Please enter the security code sent to you.`,
        inputs: [
          {
            name: 'code',
            label: 'Enter 2FA',
          },
        ],
        buttons: [
          {
            text: 'Cancel',
            role: 'cancel',
            handler: async (a: { code: string }) => {
              // Need to reset the value
              this.isSaving = false;
              this.storage.settings = (await this.storage.get(
                'settings'
              )) as unknown as Settings;
              resolve(null);
            },
          },
          {
            text: 'Confirm',
            handler: async (a: { code: string }) => {
              resolve(a.code);
            },
          },
        ],
      });

      await alert.present();
    });
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
                            this.storage.settings.recovery.email =
                              cache.settings.recovery;
                            this.storage.settings.security.freeze =
                              cache.settings.security.freeze;
                            this.storage.settings.security.twofa =
                              cache.settings.security.twoFA;
                            this.storage.settings.general.telephone =
                              cache.settings.telephone;

                            await this.storage.save();
                            //this.restart();

                            await this.otk.getWallets();
                            await this.otk.refreshWallets();
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
      if (this.loading) {
        await this.loading.dismiss();
      }
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

  public async restart() {
    if (this.platform.is('mobileweb')) {
      window.location.href = '/';
    } else {
      (
        await this.alertController.create({
          message: 'Please Restart the Application',
        })
      ).present();
      return;
      //App.exitApp();
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
