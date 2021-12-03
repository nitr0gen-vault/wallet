import { Component, OnInit } from '@angular/core';
import { Browser } from '@capacitor/browser';
import { AlertController, LoadingController } from '@ionic/angular';
import { Nitr0genApiService } from '../service/nitr0gen-api.service';
import { OtkService, Token, Wallet } from '../service/otk.service';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';

@Component({
  selector: 'app-contracts',
  templateUrl: './contracts.component.html',
  styleUrls: ['./contracts.component.scss'],
})
export class ContractsComponent implements OnInit {
  public contract: any = {
    network: 'tbnb',
    features: {
      verifiable: false,
      copyright: false,
      burnable: false,
      mintable: false,
    },
    details: {
      name: '',
      symbol: '',
      decimal: 18,
    },
  };

  private loading: HTMLIonLoadingElement;

  constructor(
    private nitr0api: Nitr0genApiService,
    private otk: OtkService,
    private alertController: AlertController,
    private loadingController: LoadingController
  ) {}

  ngOnInit() {}

  wallet: Wallet;

  contractSource: {
    bytcode: any;
    abi: any;
    tx: any;
    source: string;
  } = {
    bytcode: null,
    abi: null,
    tx: null,
    source: null,
  };

  async download() {
    console.log(this.contractSource.source);
    await Filesystem.writeFile({
      path: `token/${this.contract.details.symbol}`,
      data: JSON.stringify(this.contractSource.source),
      directory: Directory.Documents,
      encoding: Encoding.UTF8,
    });
  }

  async create() {
    const wallets = await this.otk.getWallets();
    for (let i = wallets.length; i--; ) {
      if (wallets[i].symbol === this.contract.network) {
        this.wallet = wallets[i];
        break;
      }
    }

    console.log(this.contract);
    let fees;
    switch (this.wallet.symbol) {
      case 'tbnb':
        this.contractSource = await this.nitr0api.wallet.binance.createContract(
          'test',
          this.contract
        );
        fees = await this.nitr0api.wallet.binance.getFee('test');
        break;
      case 'ropsten':
        this.contractSource =
          await this.nitr0api.wallet.ethereum.createContract(
            'test',
            this.contract
          );
        fees = await this.nitr0api.wallet.ethereum.getFee('test');
        break;
    }
    console.log(this.contractSource);

    const txSig = {
      from: this.wallet.address,
      nonce: await this.otk.getNonce(this.wallet, this.wallet.symbol),
      gas: fees.medium,
      gasLimit: 2000000,
      data: this.contractSource.tx.data,
      chainId: 97,
    };

    this.loading = await this.loadingController.create({
      message: 'Requesting Signature',
    });

    this.loading.present();

    const result = await this.otk.preflight(this.wallet.nId, txSig);

    if (await this.noErrors(result)) {
      const isTwoFa = result.$responses[0].twoFA;

      this.loadingController.dismiss();
      if (isTwoFa) {
        this.getTwoFA(txSig);
      } else {
        this.procressSign(txSig, null);
      }
    }

    // Call API to get bytecode / abi

    // Sign byte code

    // Send to network

    // Constructor Arguments
  }

  // Duplicated Code zone, The bad zone
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

  public getTwoFA(txSig: any): Promise<void> {
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
              this.procressSign(txSig, a.twoFA);
            },
          },
        ],
      });

      await alert.present();
    });
  }

  private async procressSign(txSig: any, twoFa: string | null) {
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

      let reply = (await this.otk.sendContractTransaction(
        rawTxHex,
        this.contractSource.source,
        this.contract.details.name,
        this.wallet.symbol
      )) as any;
      this.otk.setNoncePending(this.wallet);

      console.log(reply);

      this.loadingController.dismiss();

      const txId = reply.hash;
      if (txId) {
        // Add token to the wallet!!!!!
        if (reply.contractAddress) {
          // More Copy Paste
          const result = await this.nitr0api.wallet.addToken(
            this.wallet.address,
            this.contract.details.name,
            this.contract.details.symbol,
            parseInt(this.contract.details.decimal),
            reply.contractAddress
          );

          if (result) {
            this.wallet.tokens.push(result as Token);
            this.otk.refreshWallets();
          }
        }

        //this.allow('eth_sendTransaction', txId);
        await this.transactionCompleted(txId);
      } else {
        let message = '';
        if (reply.body) {
          let body = JSON.parse(reply.body);
          message = body.error.message;
        }
        console.log(message);
        //this.deny('eth_sendTransaction', message);
        await this.networkError(reply, message);
      }
    }
  }

  private async transactionCompleted(hash: string) {
    let url;
    switch (this.wallet.symbol) {
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

  private async networkError(reply: any, message?: string) {
    if (!message) {
      switch (this.wallet.symbol) {
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
    }

    const alert = await this.alertController.create({
      header: 'Network Error',
      message,
    });
    this.loadingController.dismiss();
    await alert.present();
  }
}
