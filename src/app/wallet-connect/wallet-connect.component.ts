import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import {
  BarcodeScanner,
  SupportedFormat,
} from '@capacitor-community/barcode-scanner';
import {
  ActionSheetController,
  ToastController,
  AlertController,
  LoadingController,
  Platform,
} from '@ionic/angular';
import BigNumber from 'bignumber.js';
import { ClipboardService } from 'ngx-clipboard';
import {
  BTC_DECIMAL,
  ETH_DECIMAL,
  ETH_GWEI_DECIMAL,
  Nitr0genApiService,
  TRX_DECIMAL,
} from '../service/nitr0gen-api.service';
import { OtkService, Wallet } from '../service/otk.service';
import { StorageService } from '../service/storage.service';
import { WalletConnectService } from '../service/wallet-connect.service';

@Component({
  selector: 'app-wallet-connect',
  templateUrl: './wallet-connect.component.html',
  styleUrls: ['./wallet-connect.component.scss'],
})
export class WalletConnectComponent implements OnInit {
  public walletConnectUri: string;

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
    private platform: Platform,
    public walletConnect: WalletConnectService
  ) {}

  ngOnInit() {}

  public async connect(uri?: string) {
    this.walletConnect.connect(uri ? uri : this.walletConnectUri);
  }

  public async disconnect() {
    this.walletConnect.disconnect();
  }

  public async scanner() {
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
        this.walletConnectUri = result.content;
      }
    }
  }

  public canScan() {
    return !this.platform.is('mobileweb');
  }

  public bn2N(bn: BigNumber, gwei = false): string {
    return new BigNumber(bn)
      .dividedBy(gwei ? ETH_GWEI_DECIMAL : ETH_DECIMAL)
      .toString();
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

  getAmount(wallet: Wallet): string {
    if (wallet.amount) {
      switch (wallet.symbol) {
        case 'tbtc':
        case 'btc':
          return wallet.amount.dividedBy(BTC_DECIMAL).toString();
        case 'ropsten':
        case 'eth':
        case 'bnb':
        case 'tbnb':
          return wallet.amount.dividedBy(ETH_DECIMAL).toString();
        case 'tron':
        case 'niles':
          return wallet.amount.dividedBy(TRX_DECIMAL).toString();
      }
    }
  }
}
