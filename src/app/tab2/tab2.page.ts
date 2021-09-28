import { Component, OnInit, ViewChild, ViewEncapsulation } from '@angular/core';
import {
  ActionSheetController,
  AlertController,
  ToastController,
} from '@ionic/angular';
import { SwiperComponent } from 'swiper/angular';
import { ClipboardService } from 'ngx-clipboard';
import { Browser } from '@capacitor/browser';

// import Swiper core and required modules
import SwiperCore, { Pagination, Navigation } from 'swiper';
import { OtkService, Token, Wallet } from '../service/otk.service';
import { Router } from '@angular/router';

// install Swiper modules
SwiperCore.use([Pagination, Navigation]);

// Import Swiper styles

@Component({
  selector: 'app-tab2',
  templateUrl: 'tab2.page.html',
  styleUrls: ['tab2.page.scss'],
  encapsulation: ViewEncapsulation.None,
})
export class Tab2Page implements OnInit {
  @ViewChild('swiper', { static: false }) swiper?: SwiperComponent;

  constructor(
    private actionSheetController: ActionSheetController,
    private router: Router,
    private clippy: ClipboardService,
    private toast: ToastController,
    private alert: AlertController,
    public otk: OtkService
  ) {}

  wallets: any[];
  async ngOnInit() {
    this.wallets = await this.otk.getWallets();
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
    // Coming Soon
    const alert = await this.alert.create({
      message: 'Coming Soon',
    });
    await alert.present();
  }

  async presentKebabSheet(wallet: Wallet) {
    const actionSheet = await this.actionSheetController.create({
      header: 'Actions',
      buttons: [
        {
          text: 'Send',
          icon: 'share',
          handler: () => {
            this.router.navigate(['tabs', wallet.nId, wallet.symbol]);
          },
        },
        {
          text: 'View',
          icon: 'open',
          handler: async () => {
            await this.openExplorer(wallet);
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
            this.router.navigate(['tabs', wallet.nId, symbol]);
          },
        },
        {
          text: 'View',
          icon: 'open',
          handler: async () => {
            await this.openExplorer(wallet);
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

  private async openExplorer(wallet: Wallet) {
    switch (wallet.symbol) {
      case 'tbtc':
        await Browser.open({
          url: `https://www.blockchain.com/btc-testnet/address/${wallet.address}`,
        });
        break;
      case 'btc':
        await Browser.open({
          url: `https://www.blockchain.com/btc/address/${wallet.address}`,
        });
        break;
      case 'ropsten':
        await Browser.open({
          url: `https://ropsten.etherscan.io/address/${wallet.address}`,
        });
        break;
      case 'eth':
        await Browser.open({
          url: `https://etherscan.io/address/${wallet.address}`,
        });
        break;
      case 'bnb':
        await Browser.open({
          url: `https://bscscan.com/address/${wallet.address}`,
        });
        break;
      case 'tbnb':
        await Browser.open({
          url: `https://testnet.bscscan.com/address/${wallet.address}`,
        });
        break;
      case 'tron':
        await Browser.open({
          url: `https://tronscan.org/#/address/${wallet.address}`,
        });
        break;
      case 'niles':
        await Browser.open({
          url: `https://nile.tronscan.org/#/address/${wallet.address}`,
        });
        break;
    }
  }
}
