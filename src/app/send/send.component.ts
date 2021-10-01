import { Component, HostListener, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import {
  Nitr0genApiService,
  FeePricing,
  ETH_DECIMAL,
  ETH_GWEI_DECIMAL,
  TRX_DECIMAL,
  BTC_DECIMAL,
} from '../service/nitr0gen-api.service';
import { Browser } from '@capacitor/browser';
import { OtkService, Wallet, Token } from '../service/otk.service';
import { StorageService } from '../service/storage.service';
import { BigNumber } from 'bignumber.js';
import { AlertController, LoadingController } from '@ionic/angular';

@Component({
  selector: 'app-send',
  templateUrl: './send.component.html',
  styleUrls: ['./send.component.scss'],
})
export class SendComponent implements OnInit, OnDestroy {
  wallet: Wallet = { symbol: '' } as any; //quick hack
  amount: string;
  address: string;
  twofa: string;
  twoPending = true;
  token: Token;
  network: string;
  displayFees: FeePricing = {} as any;
  fees: FeePricing;
  feeSymbol = '';
  selectedFee = 'medium';
  loading: any;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    public otk: OtkService,
    public storage: StorageService,
    private alertController: AlertController,
    private loadingController: LoadingController,
    private nitr0api: Nitr0genApiService
  ) {}

  async ngOnInit() {
    // BigNumber.config({ DECIMAL_PLACES: 0 });
    // BigNumber.config({ ROUNDING_MODE: 0 })
    const id = this.route.snapshot.params['id'];
    const token = this.route.snapshot.params['token'];
    const wallets = await this.otk.getWallets();

    wallets.forEach((wallet) => {
      if (wallet.nId === id) {
        // Update token amount if token
        if (wallet.symbol !== token) {
          this.token = wallet.tokens.find(
            (rToken) => token.toLowerCase() === rToken.symbol.toLowerCase()
          );
          this.network = wallet.symbol;
          this.wallet = { ...wallet, symbol: token, amount: this.token.amount };
        } else {
          this.network = wallet.symbol;
          this.wallet = { ...wallet };
        }
      }
    });

    switch (this.network) {
      case 'ropsten':
        //BigNumber.config({ DECIMAL_PLACES: 3 });
        this.feeSymbol = 'gwei';
        this.fees = await this.nitr0api.wallet.ethereum.getFee('test');
        this.displayFees = {
          low: parseFloat((this.fees.low / ETH_GWEI_DECIMAL).toFixed(2)),
          medium: parseFloat((this.fees.medium / ETH_GWEI_DECIMAL).toFixed(2)),
          high: parseFloat((this.fees.high / ETH_GWEI_DECIMAL).toFixed(2)),
        };

        break;
      case 'eth':
        //BigNumber.config({ DECIMAL_PLACES: 3 });
        this.feeSymbol = 'gwei';
        this.fees = await this.nitr0api.wallet.ethereum.getFee('main');

        this.displayFees = {
          low: parseFloat((this.fees.low / ETH_GWEI_DECIMAL).toFixed(2)),
          medium: parseFloat((this.fees.medium / ETH_GWEI_DECIMAL).toFixed(2)),
          high: parseFloat((this.fees.high / ETH_GWEI_DECIMAL).toFixed(2)),
        };
        break;
      case 'tbnb':
        //BigNumber.config({ DECIMAL_PLACES: 3 });
        this.feeSymbol = 'gwei';
        this.fees = await this.nitr0api.wallet.binance.getFee('test');

        this.displayFees = {
          low: parseFloat((this.fees.low / ETH_GWEI_DECIMAL).toFixed(2)),
          medium: parseFloat((this.fees.medium / ETH_GWEI_DECIMAL).toFixed(2)),
          high: parseFloat((this.fees.high / ETH_GWEI_DECIMAL).toFixed(2)),
        };
        break;
      case 'bnb':
        //BigNumber.config({ DECIMAL_PLACES: 3 });
        this.feeSymbol = 'gwei';
        this.fees = await this.nitr0api.wallet.binance.getFee('main');

        this.displayFees = {
          low: parseFloat((this.fees.low / ETH_GWEI_DECIMAL).toFixed(2)),
          medium: parseFloat((this.fees.medium / ETH_GWEI_DECIMAL).toFixed(2)),
          high: parseFloat((this.fees.high / ETH_GWEI_DECIMAL).toFixed(2)),
        };
        break;
    }
  }

  ngOnDestroy() {
    this.address = this.amount = '';
    this.wallet = {} as any;
  }

  public async send() {
    switch (this.network) {
      case 'ropsten':
        if (await this.confirm(this.amount, this.wallet.symbol, this.address)) {
          const amount = new BigNumber(
            parseFloat(this.amount) * ETH_DECIMAL
          ).decimalPlaces(0);

          let txSig;
          if (this.token) {
            txSig = {
              to: this.address,
              from: this.wallet.address,
              amount: '0x' + amount.toString(16),
              nonce: this.wallet.nonce,
              chainId: 3,
              gas: this.fees[this.selectedFee],
              contractAddress: this.token.contract,
            };
          } else {
            txSig = {
              to: this.address,
              from: this.wallet.address,
              amount: '0x' + amount.toString(16),
              nonce: this.wallet.nonce,
              chainId: 3,
              gas: this.fees[this.selectedFee],
            };
          }

          console.log(txSig);

          this.loading = await this.loadingController.create({
            message: 'Requesting Signature',
          });

          this.loading.present();

          const result = await this.otk.preflight(this.wallet.nId, txSig);

          if (await this.noErrors(result)) {
            const isTwoFa = result.$responses[0].twoFA;

            this.loadingController.dismiss();
            if (isTwoFa) {
              this.getTwoFA(txSig, (r) => {
                return r.hash;
              });
            } else {
              this.procressSign(txSig, null, (r) => {
                return r.hash;
              });
            }
          }
        }

        break;
      case 'eth':
        break;
      case 'tbnb':
        if (await this.confirm(this.amount, this.wallet.symbol, this.address)) {
          const amount = new BigNumber(
            parseFloat(this.amount) * ETH_DECIMAL
          ).decimalPlaces(0);

          let txSig;
          if (this.token) {
            txSig = {
              to: this.address,
              from: this.wallet.address,
              amount: '0x' + amount.toString(16),
              nonce: this.wallet.nonce,
              chainId: 97,
              gas: this.fees[this.selectedFee],
              contractAddress: this.token.contract,
            };
          } else {
            txSig = {
              to: this.address,
              from: this.wallet.address,
              amount: '0x' + amount.toString(16),
              nonce: this.wallet.nonce,
              chainId: 97,
              gas: this.fees[this.selectedFee],
            };
          }

          console.log(txSig);

          this.loading = await this.loadingController.create({
            message: 'Requesting Signature',
          });

          this.loading.present();

          const result = await this.otk.preflight(this.wallet.nId, txSig);

          if (await this.noErrors(result)) {
            const isTwoFa = result.$responses[0].twoFA;

            this.loadingController.dismiss();
            if (isTwoFa) {
              this.getTwoFA(txSig, (r) => {
                return r.hash;
              });
            } else {
              this.procressSign(txSig, null, (r) => {
                return r.hash;
              });
            }
          }
        }
        break;
      case 'bnb':
        break;
      case 'tbtc':
        if (await this.confirm(this.amount, this.wallet.symbol, this.address)) {
          const amount = new BigNumber(
            parseFloat(this.amount) * BTC_DECIMAL
          ).decimalPlaces(0);

          const txSig = await this.nitr0api.wallet.bitcoin.createTx(
            'test',
            this.wallet.address,
            this.address,
            amount.toNumber()
          );

          console.log(txSig);

          this.loading = await this.loadingController.create({
            message: 'Requesting Signature',
          });

          this.loading.present();

          const result = await this.otk.preflight(this.wallet.nId, txSig);

          if (await this.noErrors(result)) {
            const isTwoFa = result.$responses[0].twoFA;

            this.loadingController.dismiss();
            if (isTwoFa) {
              this.getTwoFA(txSig, (r) => {
                return r.tx.hash;
              });
            } else {
              this.procressSign(txSig, null, (r) => {
                return r.tx.hash;
              });
            }
          }
        }
        break;
      case 'btc':
        break;
      case 'trx':
        break;
      case 'niles':
        if (await this.confirm(this.amount, this.wallet.symbol, this.address)) {
          const amount = new BigNumber(
            parseFloat(this.amount) * TRX_DECIMAL
          ).decimalPlaces(0);

          const tx = await this.nitr0api.wallet.tron.createTx(
            'niles',
            this.address,
            this.wallet.address,
            amount.toNumber()
          );

          const txSig = {
            to: this.address,
            amount,
            hex: tx,
          };

          console.log(txSig);

          this.loading = await this.loadingController.create({
            message: 'Requesting Signature',
          });

          this.loading.present();

          const result = await this.otk.preflight(this.wallet.nId, txSig);

          if (await this.noErrors(result)) {
            const isTwoFa = result.$responses[0].twoFA;

            this.loadingController.dismiss();
            if (isTwoFa) {
              this.getTwoFA(txSig, (r) => {
                return r.txid;
              });
            } else {
              this.procressSign(txSig, null, (r) => {
                return r.txid;
              });
            }
          }
        }
        break;
    }
  }

  public getTwoFA(txSig: any, outputHash: Function): Promise<void> {
    return new Promise(async (resolve, reject) => {
      const alert = await this.alertController.create({
        header: 'Confirm 2FA',
        message: `Please enter the security code sent to you.`,
        inputs: [
          {
            name: 'twoFA',
            label: 'Enter 2FA',
          },
        ],
        buttons: [
          {
            text: 'Cancel',
            role: 'cancel',
            cssClass: 'secondary',
            handler: () => {
              resolve();
            },
          },
          {
            text: 'Confirm',
            handler: async (a) => {
              this.procressSign(txSig, a.twoFA, outputHash);
            },
          },
        ],
      });

      await alert.present();
    });
  }

  private async procressSign(
    txSig: any,
    twoFa: string | null,
    outputHash: Function
  ) {
    this.loading = await this.loadingController.create({
      message: 'Generating Signatures',
    });
    this.loading.present();

    // Now send 2fa
    const result = await this.otk.sign(this.wallet.nId, txSig, twoFa);

    if (await this.noErrors(result)) {
      //const signatures = Object.values(
      const rawTxHex = (result as any).$responses[0].rawTxHex;

      //console.log(result);
      console.log(rawTxHex);

      // results we need to ass responses
      this.loading.message = 'Sending to network';

      let reply = (await this.otk.sendTransaction(
        rawTxHex,
        this.network
      )) as any;

      console.log(reply);

      this.loadingController.dismiss();

      // Clear
      this.amount = '';
      this.address = '';

      const txId = outputHash(reply);
      txId
        ? await this.transactionCompleted(txId)
        : await this.networkError(reply);
    }
  }

  private async transactionCompleted(hash: string) {
    let url;
    switch (this.network) {
      case 'btc':
        url = 'https://live.blockcypher.com/btc-mainnet/tx/' + hash;
        break;
      case 'tbtc':
        url = 'https://live.blockcypher.com/btc-testnet/tx/' + hash;
        break;
      case 'tbnb':
        url = 'https://testnet.bscscan.com/tx/' + hash;
        break;
      case 'bnb':
        url = 'https://testnet.bscscan.com/tx/' + hash;
        break;
      case 'ropsten':
        url = 'https://ropsten.etherscan.io/tx/' + hash;
        break;
      case 'eth':
        url = 'https://ropsten.etherscan.io/tx/' + hash;
        break;
      case 'niles':
        url =
          'https://nile.tronscan.org/?_ga=2.110927430.217637337.1632125473-1513070376.1631871841#/transaction/' +
          hash;
        break;
      case 'trx':
        url =
          'https://tronscan.org/?_ga=2.110927430.217637337.1632125473-1513070376.1631871841#/transaction/' +
          hash;
        break;
    }

    const alert = await this.alertController.create({
      header: 'Transaction Complete',
      message: hash,
      buttons: [
        {
          text: 'View',
          cssClass: 'primary',
          handler: async () => {
            await Browser.open({
              url: url,
            });
          },
        },
        {
          text: 'Cancel',
          role: 'cancel',
          cssClass: 'secondary',
        },
      ],
    });
    alert.present();
  }

  private async networkError(reply: any) {
    let message;
    switch (this.network) {
      case 'btc':
      case 'tbtc':
        message = 'Unknown Error';
        break;
      case 'tbnb':
      case 'bnb':
        message = 'Unknown Error';
        break;
      case 'ropsten':
      case 'eth':
        message = reply.reason;
        break;
      case 'niles':
      case 'trx':
        message = 'Unknown Error';
        break;
    }

    const alert = await this.alertController.create({
      header: 'Network Error',
      message,
    });
    this.loadingController.dismiss();
    await alert.present();
  }

  private async noErrors(response: any): Promise<boolean> {
    if (response.$summary?.errors) {
      const alert = await this.alertController.create({
        header: 'Request Error',
        message: response.$summary?.errors[0]
          .match(/(?:"[^"]*"|^[^"]*$)/)[0]
          .replace(/"/g, ''),
      });
      this.loadingController.dismiss();
      await alert.present();
      return false;
    }
    return true;
  }

  public confirm(amount: string, symbol: string, to: string): Promise<boolean> {
    return new Promise(async (resolve, reject) => {
      const alert = await this.alertController.create({
        header: 'Confirm Transaction',
        message: `${amount} ${symbol} to <br>${to}`,
        buttons: [
          {
            text: 'Cancel',
            role: 'cancel',
            cssClass: 'secondary',
            handler: () => {
              resolve(false);
            },
          },
          {
            text: 'Confirm',
            handler: async () => {
              resolve(true);
            },
          },
        ],
      });
      await alert.present();
    });
  }

  public cancel() {
    this.router.navigate(['tabs', 'tab2']);
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
        default:
          if (this.token) {
            // Need to ship decimals / store
            return this.token.amount.toString();
          }
      }
    }
    return '0';
  }

  // This function is everywhere
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

  symbolIconError($event) {  
    $event.srcElement.src='/assets/crypto/icons/generic.svg';
  }

}
