import { App } from '@capacitor/app';
import { Component, OnInit, ViewChild, ViewEncapsulation } from '@angular/core';
import {
  ActionSheetController,
  AlertController,
  LoadingController,
  Platform,
  ToastController,
} from '@ionic/angular';
import { SwiperComponent } from 'swiper/angular';
import { ClipboardService } from 'ngx-clipboard';
import { Browser } from '@capacitor/browser';
import { BigNumber } from 'bignumber.js';

// import Swiper core and required modules
import SwiperCore, { Pagination, Navigation } from 'swiper';
import { OtkService, Token, Wallet } from '../service/otk.service';
import { Router } from '@angular/router';
import {
  BTC_DECIMAL,
  ETH_DECIMAL,
  Nitr0genApiService,
  TRX_DECIMAL,
} from '../service/nitr0gen-api.service';
import { lastValueFrom } from 'rxjs';
import { StorageService } from '../service/storage.service';
import { WalletConnectService } from '../service/wallet-connect.service';

// install Swiper modules
SwiperCore.use([Pagination, Navigation]);

// Import Swiper styles

@Component({
  selector: 'app-wallet',
  templateUrl: 'wallet.page.html',
  styleUrls: ['wallet.page.scss'],
  encapsulation: ViewEncapsulation.None,
})
export class WalletPage implements OnInit {
  refreshing = false;
  @ViewChild('swiper', { static: false }) swiper?: SwiperComponent;

  constructor(
    private actionSheetController: ActionSheetController,
    private router: Router,
    private clippy: ClipboardService,
    private toast: ToastController,
    private alert: AlertController,
    public otk: OtkService,
    private nitr0gen: Nitr0genApiService,
    private alertController: AlertController,
    private loadingController: LoadingController,
    private storage: StorageService,
    public walletConnect: WalletConnectService
  ) {}

  wallets: any[];
  async ngOnInit() {
    this.wallets = await this.otk.getWallets();
  }

  async refresh() {
    // TODO Refresh settings? (in case of multiple devices)
    this.refreshing = true;
    const pair = (await lastValueFrom(this.nitr0gen.pairCheck())) as any;
    if (pair) {
      const alert = await this.alertController.create({
        header: 'Incoming Pair',
        message: `Pairing your profile with ${pair.uuid}`,
        buttons: [
          {
            text: 'Cancel',
            handler: async () => {
              const response = (await lastValueFrom(
                this.nitr0gen.pairConfirm(false)
              )) as any;
              console.log(response);
            },
          },
          {
            text: 'Confirm',
            handler: async () => {
              const response = (await lastValueFrom(
                this.nitr0gen.pairConfirm(true)
              )) as any;

              console.log(response);

              if (response.keys) {
                // We had keys moved so lets cache ourselves
                // Going to copy paste code from settings for now
                const loading = await this.loadingController.create({
                  message: 'Refreshing Wallets',
                });
                await loading.present();
                //this.loading.message = 'Refreshing Wallets';
                await this.otk.forceKeyIdentity(pair.nId);

                // get wallets from api
                const cache = await this.nitr0gen.wallet.cache(
                  await this.otk.getDeviceUuid()
                );

                const tmpWallets: Wallet[] = [];

                // We are now on a different uuid (possibly)
                // Do we need to add them on the api side onto the new uuid
                // Duplicates doesn't matter as its the signing side that protects everything

                if (cache.keys) {
                  // TODO Check for duplicates (re double pairing scenario)
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
                  this.storage.settings.general.email = cache.settings.email;
                  this.storage.settings.recovery.email =
                    cache.settings.recovery;
                  this.storage.settings.security = {
                    freeze: cache.settings.security?.freeze || false,
                    twofa: cache.settings.security?.twoFA || false,
                  };
                  this.storage.settings.general.telephone =
                    cache.settings.telephone;

                  await this.storage.save();
                  await loading.dismiss();
                  this.restart();
                }
              }
            },
          },
        ],
      });
      await alert.present();
      this.refreshing = false;
    } else {
      this.wallets = await this.otk.refreshWallets();
      this.refreshing = false;
    }
  }

  symbolIconError($event) {
    $event.srcElement.src = '/assets/crypto/icons/generic.svg';
  }

  public async restart() {
    this.wallets = await this.otk.getWallets();
    this.refresh();
  }

  getAmount(wallet: Wallet): string {
    if (wallet.amount) {
      // From memory will primitive
      if (!BigNumber.isBigNumber(wallet.amount)) {
        wallet.amount = new BigNumber(wallet.amount);
      }
      switch (wallet.symbol) {
        case 'tbtc':
        case 'btc':
          return wallet.amount.dividedBy(BTC_DECIMAL).toString();
        case 'ropsten':
        case 'eth':
        case 'bnb':
        case 'tbnb':
          return wallet.amount.dividedBy(ETH_DECIMAL).toString();
        case 'trx':
        case 'niles':
          return wallet.amount.dividedBy(TRX_DECIMAL).toString();
      }
    }
  }

  symbolConvert(symbol: string) {
    switch (symbol) {
      case 'tbtc':
        return 'btc';
      case 'tbnb':
        return 'bnb';
      case 'ropsten':
        return 'eth';
      case 'niles':
        return 'trx';
      default:
        return symbol;
    }
  }

  async addToken(wallet: Wallet) {
    this.router.navigate(['tabs', 'token', wallet.nId]);
  }

  async presentKebabSheet(wallet: Wallet) {
    const actionSheet = await this.actionSheetController.create({
      header: 'Actions',
      buttons: [
        {
          text: 'Send',
          icon: 'share',
          handler: () => {
            this.router.navigate(['tabs', 'send', wallet.nId, wallet.symbol]);
          },
        },
        {
          text: 'Block explorer',
          icon: 'open',
          handler: async () => {
            await this.openExplorer(wallet);
          },
        },
        {
          text: 'Storage Status',
          icon: 'information-circle-outline',
          handler: async () => {
            await this.router.navigate(['tabs', 'status', wallet.nId]);
          },
        },
        {
          text: 'Copy Address',
          icon: 'clipboard',
          handler: async () => {
            this.clippy.copy(wallet.address);
            const toast = await this.toast.create({
              message: 'Address copied to clipboard',
              duration: 2000,
              position: 'middle',
              translucent: true,
              animated: true,
            });
            toast.present();
          },
        },
        {
          text: 'Hide',
          icon: 'eye-off',
          handler: async () => {
            wallet.hidden = true;
            this.otk.setWallets();
          },
        },
        {
          text: 'Cancel',
          icon: 'close',
          role: 'cancel',
          handler: () => {
            console.log('Cancel clicked');
          },
        },
      ],
    });
    await actionSheet.present();

    const { role } = await actionSheet.onDidDismiss();
    console.log('onDidDismiss resolved with role', role);
  }

  async presentActionSheet(wallet: Wallet, token: Token, symbol: string) {
    const actionSheet = await this.actionSheetController.create({
      header: 'Token Actions',
      buttons: [
        {
          text: 'Send',
          icon: 'share',
          handler: () => {
            this.router.navigate(['tabs', 'send', wallet.nId, symbol]);
          },
        },
        {
          text: 'View',
          icon: 'open',
          handler: async () => {
            await this.openExplorer(wallet, token.contract);
          },
        },
        {
          text: 'Hide',
          icon: 'eye-off',
          handler: async () => {
            token.hidden = true;
            this.otk.setWallets();
          },
        },
        {
          text: 'Cancel',
          icon: 'close',
          role: 'cancel',
          handler: () => {
            console.log('Cancel clicked');
          },
        },
      ],
    });
    await actionSheet.present();

    //const { role } = await actionSheet.onDidDismiss();
    //console.log('onDidDismiss resolved with role', role);
  }

  private async openExplorer(wallet: Wallet, overide?: string) {
    switch (wallet.symbol) {
      case 'tbtc':
        await Browser.open({
          url: `https://www.blockchain.com/btc-testnet/address/${
            overide || wallet.address
          }`,
        });
        break;
      case 'btc':
        await Browser.open({
          url: `https://www.blockchain.com/btc/address/${
            overide || wallet.address
          }`,
        });
        break;
      case 'ropsten':
        await Browser.open({
          url: `https://ropsten.etherscan.io/address/${
            overide || wallet.address
          }`,
        });
        break;
      case 'eth':
        await Browser.open({
          url: `https://etherscan.io/address/${overide || wallet.address}`,
        });
        break;
      case 'bnb':
        await Browser.open({
          url: `https://bscscan.com/address/${overide || wallet.address}`,
        });
        break;
      case 'tbnb':
        await Browser.open({
          url: `https://testnet.bscscan.com/address/${
            overide || wallet.address
          }`,
        });
        break;
      case 'tron':
        await Browser.open({
          url: `https://tronscan.org/#/address/${overide || wallet.address}`,
        });
        break;
      case 'niles':
        await Browser.open({
          url: `https://nile.tronscan.org/#/address/${
            overide || wallet.address
          }`,
        });
        break;
    }
  }
}
