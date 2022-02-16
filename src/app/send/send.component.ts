import {
  BarcodeScanner,
  SupportedFormat,
} from '@capacitor-community/barcode-scanner';
import { Keyboard } from '@capacitor/keyboard';
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
import { OtkService, Wallet, Token, Partition } from '../service/otk.service';
import { StorageService } from '../service/storage.service';
import { BigNumber } from 'bignumber.js';
import { AlertController, LoadingController, Platform } from '@ionic/angular';
import { CryptoAddressValidator } from './validator';

@Component({
  selector: 'app-send',
  templateUrl: './send.component.html',
  styleUrls: ['./send.component.scss'],
})
export class SendComponent implements OnInit, OnDestroy {
  wallet: Wallet = { symbol: '' } as any; //quick hack
  amount: string;
  address: string;
  internalAddress: string;
  twofa: string;
  twoPending = true;
  token: Token;
  network: string;
  displayFees: FeePricing = {} as any;
  fees: FeePricing;
  feeSymbol = '';
  selectedFee = 'medium';
  loading: any;
  addressIsInternal = false;
  gasFreeTransaction = false;
  gasFreeExternal = false;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    public otk: OtkService,
    public storage: StorageService,
    private alertController: AlertController,
    private loadingController: LoadingController,
    private nitr0api: Nitr0genApiService,
    private platform: Platform
  ) {}

  async ngOnInit() {
    // BigNumber.config({ DECIMAL_PLACES: 0 });
    // BigNumber.config({ ROUNDING_MODE: 0 })
    const id = this.route.snapshot.params['id'];
    const token = this.route.snapshot.params['token'];
    const wallets = await this.otk.getWallets();

    for (let i = 0; i < wallets.length; i++) {
      const wallet = wallets[i];
      if (wallet.nId === id) {
        // Update token amount if token
        if (wallet.symbol !== token) {
          this.token = wallet.tokens.find(
            (rToken) => token.toLowerCase() === rToken.symbol.toLowerCase()
          );
          this.network = wallet.symbol;
          this.wallet = { ...wallet, symbol: token, amount: this.token.amount };
          // We need to copy it here to modify symbol and amount (or do naother way)
          // so tokens will still have loading problems but coins should be fine!
          // partitions will also run into this error when caching
        } else {
          this.network = wallet.symbol;
          //this.wallet = { ...wallet };
          this.wallet = wallet;
        }
      }
    }

    // Dev refresh hack fix
    if (!this.wallet.amount?.dividedBy) {
      (window as any).location = '/'; 
    }

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
    this.wallet = { symbol: '' } as any;
  }

  private async gassFreeChainIdSend(
    chainId: number,
    toSendFrom?: { partition: Partition; value: BigNumber }[]
  ) {
    if (await this.confirm(this.amount, this.wallet.symbol, this.address)) {
      this.loading = await this.loadingController.create({
        message: 'Preparing Gasless Transaction',
      });

      this.loading.present();

      // Convert this.address to the nId

      let txSig;
      if (this.token) {
        console.log("TOKEN NOT SUPPORTED, Also shouldn't got this far");
      } else {
        let amount = new BigNumber(
          parseFloat(this.amount) * ETH_DECIMAL
        ).decimalPlaces(0);
        txSig = {
          to: this.internalAddress,
          from: this.wallet.address,
          amount: '0x' + amount.toString(16),
          chainId,
        };
      }

      const result = await this.otk.gasFreePreflight(this.wallet.nId, txSig);

      if (await this.noErrors(result)) {
        const isTwoFa = result.$responses[0].twoFA;

        this.loadingController.dismiss();
        if (isTwoFa) {
          this.getTwoFA(
            txSig,
            (r) => {
              return r.hash;
            },
            true,
            toSendFrom
          );
        } else {
          this.processGasFree(txSig, null, toSendFrom);
        }
      }
    }
  }

  private async chainIdSend(chainId: number) {
    if (await this.confirm(this.amount, this.wallet.symbol, this.address)) {
      this.loading = await this.loadingController.create({
        message: 'Requesting Signature',
      });

      this.loading.present();

      let txSig;
      if (this.token) {
        let amount = new BigNumber(
          parseFloat(this.amount) * (10 ** this.token.decimal || 18)
        ).decimalPlaces(0);

        txSig = {
          to: this.address,
          from: this.wallet.address,
          amount: '0x' + amount.toString(16),
          nonce: await this.otk.getNonce(this.wallet, this.network),
          chainId,
          gas: this.fees[this.selectedFee],
          contractAddress: this.token.contract,
        };
      } else {
        let amount = new BigNumber(
          parseFloat(this.amount) * ETH_DECIMAL
        ).decimalPlaces(0);
        txSig = {
          to: this.address,
          from: this.wallet.address,
          amount: '0x' + amount.toString(16),
          nonce: await this.otk.getNonce(this.wallet, this.network),
          chainId,
          gas: this.fees[this.selectedFee],
        };
      }

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
  }

  private async bitcoinSend(network: 'test' | 'main') {
    if (await this.confirm(this.amount, this.wallet.symbol, this.address)) {
      this.loading = await this.loadingController.create({
        message: 'Requesting Signature',
      });

      this.loading.present();

      const amount = new BigNumber(
        parseFloat(this.amount) * BTC_DECIMAL
      ).decimalPlaces(0);

      const txSig = await this.nitr0api.wallet.bitcoin.createTx(
        network,
        this.wallet.address,
        this.address,
        amount.toNumber()
      );

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
  }

  private async tronSend(network: 'main' | 'niles') {
    if (await this.confirm(this.amount, this.wallet.symbol, this.address)) {
      this.loading = await this.loadingController.create({
        message: 'Requesting Signature',
      });

      this.loading.present();

      const amount = new BigNumber(
        parseFloat(this.amount) * TRX_DECIMAL
      ).decimalPlaces(0);

      const tx = await this.nitr0api.wallet.tron.createTx(
        network,
        this.address,
        this.wallet.address,
        amount.toNumber()
      );

      const txSig = {
        to: this.address,
        amount,
        hex: tx,
      };

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
  }

  private async basicAlert(header: string, message: string) {
    const alert = await this.alertController.create({
      header,
      message,
      buttons: [
        // {
        //   text: 'View',
        //   cssClass: 'primary',
        //   handler: async () => {
        //     await Browser.open({
        //       url: url,
        //     });
        //   },
        // },
        {
          text: 'Cancel',
          role: 'cancel',
          cssClass: 'secondary',
        },
      ],
    });
    await alert.present();
  }

  public async send() {
    /**
     * Send from which balance?
     * This question effects all type of transfer gas,free,new however our overall goal is to always reduce fees.
     *
     * You have 2 balances, your actual crypto balance and the balance from partitions.
     * Your actual real balance maybe be redduced because it has been partitioned (like electrcity actual power real power)
     *
     * If the user opts to send using gas most the times the actual real balance should be used first. However we still need to
     * check for partitions because we need to calculate the fee and make sure they are not sending beyond their acutal balance.
     * This would be the same calculation if using partitioned balances because they need to cover the fee within their partition.
     *
     * The one exception to this "wanting to pay the fee" is if they happen to be sending the crypto to someone who that have already have partition
     * ownership from. In this case as long as the partition balance its less or equal to the sending amount this partition should be used to reduce
     * the fragmentation.
     *
     * Going gasless is simplier because of the no fee calcvuation (not including any use of no** tokens). Just need to aggregate their subparts to send
     * the right total. Of course priority should be given to any subparts that are already from the intended receipent as above.
     *
     * new user, Does mean we need to know an email address. We would use a "tmp" key addres to hold onto the partition. When the user provides the email
     * and the code this tmp key will either become theirs or we can do another internal partition transfer into their keys.
     *
     * As always the biggest "cost" is going to be multiple partitons paying gas fees. This is essentually the UTXO model. Which is where our own utility
     * token could have value.
     *
     * So as this is phase 0 (getting to work, not performance biased design or even cost optimising) what needs to be done first
     * is a basic selector which just selects the right balances and transfer.
     *
     * Real Balance - This is what the blockchain thinks the key hold
     * Actual Real Balance - This is what they key really owns because of partition deduction.
     *
     */

    // Lets select from up here as it could impact all 3 methods
    // This code is duplicated everywhere, Needs to be normalised for all networks as well.
    const actualSendAmount = new BigNumber(
      parseFloat(this.amount) * ETH_DECIMAL
    ).decimalPlaces(0);

    // "copy" to minus
    let toSendAmount = new BigNumber(
      parseFloat(this.amount) * ETH_DECIMAL
    ).decimalPlaces(0);
    const toSendAmountFrom: { partition: Partition; value: BigNumber }[] = [];

    // Lets not prevent tokens from working the old method
    if (!this.token) {
      // do we have enough aggregated balance
      // If gas paying not this black and white fees based on how many inputs utxo
      if (!this.wallet.amount.gte(actualSendAmount)) {
        return await this.basicAlert('Error', 'Balance to low');
      }

      // Do we have partitions to send?
      if (this.wallet.partitions.length) {
        // Source of funds
        // Are we sending to someone we have a partition with
        let sharedPartition: Partition;
        if (
          (sharedPartition = this.wallet.partitions.find(
            (part) => part.id == this.internalAddress
          ))
        ) {
          // We have some of their balance
          //console.log(sharedPartition);
          const tmpBn = new BigNumber(sharedPartition.value);

          if (tmpBn.gte(actualSendAmount)) {
            // this covers it
            toSendAmountFrom.push({
              partition: sharedPartition,
              value: actualSendAmount,
            });
            toSendAmount = toSendAmount.minus(actualSendAmount);
          } else {
            // Only partially covers
            toSendAmountFrom.push({ partition: sharedPartition, value: tmpBn });
            toSendAmount = toSendAmount.minus(tmpBn);
          }
        }

        // We may have a partition but it may not be enough to send.
        if (!toSendAmount.isZero()) {
          // Loop avoiding the already spent partition
          for (let i = 0; i < this.wallet.partitions.length; i++) {
            const partition = this.wallet.partitions[i];

            // Make sure we haven't used it yet
            if (sharedPartition?.id !== partition.id) {
              const tmpBn = new BigNumber(partition.value);

              if (tmpBn.gte(toSendAmount)) {
                // This covers it
                toSendAmountFrom.push({
                  partition,
                  value: toSendAmount,
                });
                toSendAmount = toSendAmount.minus(toSendAmount);
              } else {
                // Still only partially covers
                toSendAmountFrom.push({
                  partition,
                  value: tmpBn,
                });
                toSendAmount = toSendAmount.minus(tmpBn);
              }
            }

            // Do we have enough!
            if (toSendAmount.isZero()) {
              break;
            }
          }
        }

        if (toSendAmount.isZero()) {
          // After loop still not enough real actual balance will be needed.
          console.log('We have enough to send using these partitions :');
          console.log(toSendAmountFrom);
        } else {
          console.log(
            'We are missing ' +
              toSendAmount.toString() +
              ' but maybe our balnace is not partiotoned'
          );
          // this can still work use these as output and toSenAmount as balance to be partitioned
          console.log(toSendAmountFrom);
        }
      }
    }

    if (!this.gasFreeTransaction) {
      // These currently deal with real balance only. They just sign for the amount on the key
      // Meaning right now 0 protection if you "own" some via a partion
      switch (this.network) {
        case 'ropsten':
          await this.chainIdSend(3);
          break;
        case 'eth':
          await this.chainIdSend(1);
          break;
        case 'tbnb':
          await this.chainIdSend(97);
          break;
        case 'bnb':
          await this.chainIdSend(56);
          break;
        case 'tbtc':
          this.bitcoinSend('test');
          break;
        case 'btc':
          this.bitcoinSend('main');
          break;
        case 'trx':
          this.tronSend('main');
          break;
        case 'niles':
          this.tronSend('niles');
          break;
      }
    } else {
      if (this.gasFreeExternal) {
        // Invite / Send Process TBD
        console.log('Invite to Sending free ' + this.network);
      } else {
        console.log('Sending free ' + this.network);
        if (this.token) {
          alert('GAS FREE Token NOT Supported YET');
          console.log('TOKEN NOT SUPPORTED');
        } else {
          await this.gassFreeChainIdSend(97, toSendAmountFrom);
        }
      }
    }
  }

  public getTwoFA(
    txSig: any,
    outputHash: Function,
    gasFree = false,
    toSendFrom?: { partition: Partition; value: BigNumber }[]
  ): Promise<void> {
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
              if (gasFree) {
                this.processGasFree(txSig, a.twoFA, toSendFrom);
              } else {
                this.procressSign(txSig, a.twoFA, outputHash);
              }
            },
          },
        ],
      });

      await alert.present();
    });
  }

  private async processGasFree(
    txSig: any,
    twoFa: string | null,
    toSendFrom?: { partition: Partition; value: BigNumber }[]
  ) {
    this.loading = await this.loadingController.create({
      message: 'Processing Gasless Transfer',
    });
    this.loading.present();

    // Now send 2fa
    const result = await this.otk.gasFreeSend(
      this.wallet.nId,
      txSig,
      twoFa,
      toSendFrom
    );

    if (await this.noErrors(result)) {
      console.log(result);

      // Clear
      this.amount = '';
      this.address = '';
      const wallets = await this.otk.refreshWallets(true);

      // Find wallet and cache into send page
      // almost copy / paste, We are not using token but can use this.wallet.symbol as token should overwrite
      // wallets.forEach((wallet) => {});
      // foreach isn't awaitable, Should be fine but for now switched to for
      for (let i = 0; i < wallets.length; i++) {
        const wallet = wallets[i];
        if (wallet.nId === this.wallet.nId) {
          // Update token amount if token
          if (wallet.symbol !== this.wallet.symbol) {
            this.token = wallet.tokens.find(
              (rToken) =>
                this.wallet.symbol.toLowerCase() === rToken.symbol.toLowerCase()
            );
            this.network = wallet.symbol;
            this.wallet = {
              ...wallet,
              symbol: this.wallet.symbol,
              amount: this.token.amount,
            };
          } else {
            this.network = wallet.symbol;
            this.wallet = { ...wallet };
          }
        }
      }

      this.loadingController.dismiss();
      this.cancel();
    }
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
      this.otk.setNoncePending(this.wallet);

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
        document.body.style.opacity = '1';
        this.address = result.content;
      }
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

  private checkedAddress: string;
  public async checkAddress(address: string) {
    if (address !== this.checkedAddress) {
      this.checkedAddress = address; //could use (input)=$event
      if (
        CryptoAddressValidator.test(
          address,
          this.network,
          this.network === 'tbtc' ? true : false
        )
      ) {
        // Valid address, We should see if it is an internal one for gas free transfers
        const internal = await this.nitr0api.wallet.isInternal(
          address,
          this.network
        );
        console.log(internal);
        if (internal) {
          console.log('Internal Address!');
          this.internalAddress = internal.internal;
          this.addressIsInternal = this.gasFreeTransaction = true;
        } else {
          console.log('external Address :(');
          this.internalAddress = null;
          this.addressIsInternal = this.gasFreeTransaction = false;
        }
      }
    }
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
    $event.srcElement.src = '/assets/crypto/icons/generic.svg';
  }
}
