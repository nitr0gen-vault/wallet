import {
  IKey,
  KeyHandler,
  KeyType,
  TransactionHandler,
  IBaseTransaction,
} from '@activeledger/sdk';
import { Device } from '@capacitor/device';
import { Injectable } from '@angular/core';
import { lastValueFrom } from 'rxjs/internal/lastValueFrom';
import { StorageService } from './storage.service';
import { Nitr0genApiService } from './nitr0gen-api.service';
import { LoadingController } from '@ionic/angular';
import { BigNumber } from 'bignumber.js';

export type Otk = IKey;

export interface Wallet {
  symbol: string;
  nId: string;
  address: string;
  nonce: number;
  hashes: string[];
  tokens: Token[];
  amount?: BigNumber;
}

export interface Token {
  decimal?: number;
  name: string;
  contract: string;
  symbol: string;
  amount?: BigNumber;
  hidden?: boolean;
}

export enum Nitr0gen {
  Namespace = 'notabox.keys',
  Onboard = 'df9e4e242c58cc6a03ca1679f007c7a04cad72c97fdb74bdfe9a4e1688077a79',
  Create = 'c278818b9f10d5f18381a711827e344d583f7ecf446cdfb4b92016b308838a72',
  DiffConsensus = 'a9711259f9c0322c6eb1cca4c0baf1b460266be79c5c0f78cf1602a8476e0744',
  Preflight = '2a43dc59d4cfa0f8a5ad143247db41dd6524cc9e1a18fd7a00f14d0ca7bbac62',
  Sign = 'f155dee677c1c2d661715d6b99e976f54534ae92bc6b73f5483e0ba08ea4f78b',
}

@Injectable({
  providedIn: 'root',
})
export class OtkService {
  private otk: Otk;
  private wallet: Wallet[];
  private loading: HTMLIonLoadingElement;
  public pnt = "";

  //wallet$: Subject<Wallet> = new Subject();

  constructor(
    private storage: StorageService,
    private nitr0api: Nitr0genApiService,
    private loadingControl: LoadingController
  ) {
    (async () => {
      await this.getKey();
      if (!this.otk) {
        // Time to create
        await this.loader('Creating Device OTK');

        this.otk = await this.generateOtk();
        await this.storage.set('otk', this.otk);
      }

      if (!this.otk.identity || !(await this.getWallets()).length) {
        if (!this.otk.identity) {
          console.log('OTK Needs Onboarding');
          await this.loader('Onboarding Device OTK');
          // No Identity, We need to onboard
          // No references can have multiple accounts
          const result = await lastValueFrom(
            this.nitr0api.create(
              this.otk.key.pub.pkcs8pem,
              await this.onboard(),
              this.pnt
            )
          );

          if (result.nId) {
            this.setKeyIdentity(result.nId);
          } else {
            const error = result as any;
            console.log(error.status);
          }
        }

        if (!(await this.getWallets()).length) {
          // Now to Create wallets
          await this.loader('Creating Bitcoin Wallet');
          let w = await this.createWallet('tbtc');
          this.wallet.push(w);
          //this.wallet$.next(w);

          await this.loader('Creating Ethereum Wallet');
          w = await this.createWallet('ropsten', [
            {
              name: 'Tether',
              symbol: 'USDT',
              contract: '0xdac17f958d2ee523a2206206994597c13d831ec7',
            },
            {
              name: 'USD Coin',
              symbol: 'USDC',
              contract: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
            },
            {
              name: 'Uniswap',
              symbol: 'UNI',
              contract: '0x1f9840a85d5af5bf1d1762f925bdaddc4201f984',
            },
            {
              name: 'Chainlink',
              symbol: 'LINK',
              contract: '0x514910771af9ca656af840dff83e8264ecf986ca',
            },
            {
              name: 'Wrapped Bitcoin',
              symbol: 'WBTC',
              contract: '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599',
            },
            {
              name: 'Dai',
              symbol: 'DAI',
              contract: '0x6b175474e89094c44da98b954eedeac495271d0f',
            },
          ]);
          this.wallet.push(w);
          //this.wallet$.next(w);

          await this.loader('Creating Binance Wallet');
          w = await this.createWallet('tbnb', [
            {
              name: 'Binance USD',
              symbol: 'BUSD',
              contract: '0x4Fabb145d64652a948d72533023f6E7A623C7C53',
            },
            {
              name: 'FTX Token',
              symbol: 'FTT',
              contract: '0x50d1c9771902476076ecfc8b2a83ad6b9355a4c9',
            },
            {
              name: 'Bitcoin BEP2',
              symbol: 'BTCB',
              contract: '0x7130d2a12b9bcbfae4f2634d864a1ee1ce3ead9c',
            },
            {
              name: 'TrueUSD',
              symbol: 'TUSD',
              contract: '0x0000000000085d4780B73119b644AE5ecd22b376',
            },
            {
              name: 'Nexo',
              symbol: 'NEXO',
              contract: '0xb62132e35a6c13ee1ee0f84dc5d40bad8d815206',
            },
            {
              name: 'Ankr',
              symbol: 'ANKR',
              contract: '0x8290333cef9e6d528dd5618fb97a76f268f3edd4',
            },
            {
              name: 'Trust Wallet Token',
              symbol: 'TWT',
              contract: '0x4b0f1812e5df2a09796481ff14017e6005508003',
            },
          ]);
          this.wallet.push(w);
          //this.wallet$.next(w);

          await this.loader('Creating Tron Wallet');
          w = await this.createWallet('niles', [
            {
              name: 'Wrapped TRX',
              symbol: 'WTRX',
              contract: 'TNUC9Qb1rRpS5CbWLmNMxXBjyFoydXjWFR',
            },
            {
              name: 'Wrapped BTT',
              symbol: 'WBTT',
              contract: 'TKfjV9RNKJJCqPvBtK8L7Knykh7DNWvnYt',
            },
            {
              name: 'Wrapped BTC',
              symbol: 'WBTC',
              contract: 'TXpw8XeWYeTUd4quDskoUqeQPowRh4jY65',
            },
            {
              name: 'USD Coin',
              symbol: 'USDC',
              contract: 'TEkxiTehnzSmSe2XqrBj4w32RUN966rdz8',
            },
            {
              name: 'Tether',
              symbol: 'USDT',
              contract: 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t',
            },
            {
              name: 'JUST Stablecoin',
              symbol: 'USDJ',
              contract: 'TMwFHYXLJaRUPeW6421aqXL4ZEzPRFGkGT',
            },
          ]);
          this.wallet.push(w);
          //this.wallet$.next(w);

          await this.loader('Settling Locally');
          await this.storage.set('wallet', this.wallet);
        }
      }
      if (this.loading) {
        this.loading.dismiss();
      }
      console.log(`OTK Identity : ${this.otk.identity}`);
      console.log('Local Wallets:');
      console.log(this.wallet);
    })();
  }

  private async createWallet(
    symbol: string,
    tokens?: Token[]
  ): Promise<Wallet> {
    let results = await this.nitr0api.wallet.add(
      symbol,
      this.otk.identity,
      await this.keyCreate(symbol, false)
    );

    await this.loader(`Verifying ${symbol.toUpperCase()} Wallet Integrity`);

    await this.nitr0api.wallet.diffConsensus(
      await this.diffConsensus(
        results.key.nId,
        results.key.address,
        results.hashes
      )
    );

    return {
      symbol,
      nId: results.key.nId,
      address: results.key.address,
      hashes: results.hashes,
      nonce: 0,
      tokens,
    };
  }

  private async generateOtk(): Promise<Otk> {
    const kh = new KeyHandler();
    console.log('Generating new OTK');
    return kh.generateKey('otk', KeyType.EllipticCurve);
  }

  private async onboard(): Promise<IBaseTransaction> {
    const txHandler = new TransactionHandler();
    const key = await this.getKey();

    // Build Transaction
    const txBody: IBaseTransaction = {
      $tx: {
        $namespace: Nitr0gen.Namespace,
        $contract: Nitr0gen.Onboard,
        $i: {
          otk: {
            publicKey: key.key.pub.pkcs8pem,
            type: key.type,
            uuid: (await Device.getId()).uuid,
          },
        },
      },
      $sigs: {},
      $selfsign: true,
    };

    // Sign Transaction & Send
    return await txHandler.signTransaction(txBody, key);
  }

  private async loader(message: string): Promise<void> {
    if (!this.loading) {
      this.loading = await this.loadingControl.create({
        animated: true,
        translucent: true,
        message,
      });
      await this.loading.present();
    } else {
      this.loading.message = message;
    }
  }

  public async getWallets(): Promise<Wallet[]> {
    if (!this.wallet) {
      this.wallet = (await this.storage.get('wallet', [])) as Wallet[];
    }
    // Let this one do it's thing in the background
    this.fetchBalances();
    return this.wallet;
  }

  public async refreshWallets(): Promise<Wallet[]> {
    if (!this.wallet) {
      this.wallet = (await this.storage.get('wallet', [])) as Wallet[];
    }
    // Let this one do it's thing in the background
    await this.fetchBalances();
    return this.wallet;
  }

  public async setWallets(): Promise<void> {
    await this.storage.set('wallet', await this.getWallets());
  }

  private fetching = false;
  private async fetchBalances() {
    if (!this.fetching) {
      this.fetching = true;
      for (let i = 0; i < this.wallet.length; i++) {
        const wallet = this.wallet[i];

        //}
        //this.wallet.forEach(async (wallet) => {
        // Get Balance
        const balances = await this.fetchBalance(wallet.address, wallet.symbol);
        wallet.amount = balances.balance;
        wallet.nonce = balances.nonce;

        // Procress Tokens
        if (balances.tokens && wallet.tokens) {
          // This loops local and updated
          wallet.tokens.forEach((token) => {
            const rToken = balances.tokens.find(
              (rToken) =>
                token.symbol.toLowerCase() === rToken.symbol.toLowerCase()
            );
            token.amount = rToken.balance;
            token.decimal = rToken.decimal;
          });

          // Doing it like this is inefficient

          // Now we need to loop remote and add? (or other way around)
          balances.tokens.forEach((token) => {
            const localToken = wallet.tokens.find(
              (rToken) =>
                token.symbol.toLowerCase() === rToken.symbol.toLowerCase()
            );            
            if (!localToken) {
              // Add
              wallet.tokens.push({
                amount: token.balance,
                decimal: token.balance,
                name: token.name,
                symbol: token.symbol,
                contract: token.address,
              });
            }
          });
        }
        // Update local with latest
        await this.storage.set('wallet', await this.wallet);
      } //);
      this.fetching = false;
    }
  }

  private async fetchBalance(
    address: string,
    symbol: string
  ): Promise<{
    balance: BigNumber;
    nonce?: number;
    tokens?: any[];
  }> {
    let result;
    let tokens;
    switch (symbol) {
      case 'tbtc':
        result = await this.nitr0api.wallet.bitcoin.getAddress('test', address);
        // {"address":"mqokzGXZi5zHm5qbyJ85KMvh5dMVDeq9Pd","total_received":0,"total_sent":0,"balance":0,"unconfirmed_balance":0,"final_balance":0,"n_tx":0,"unconfirmed_n_tx":0,"final_n_tx":0,"tx_url":"https://api.blockcypher.com/v1/btc/test3/txs/"}
        return {
          balance: new BigNumber(result.balance),
        };
      case 'ropsten':
        result = await this.nitr0api.wallet.ethereum.getAddress(
          'test',
          address
        );
        return {
          balance: new BigNumber(result.balance),
          nonce: result.nonce,
          tokens: result.tokens,
        };
      case 'tbnb':
        result = await this.nitr0api.wallet.binance.getAddress('test', address);
        return {
          balance: new BigNumber(result.balance),
          nonce: result.nonce,
          tokens: result.tokens,
        };
      case 'niles':
        result = await this.nitr0api.wallet.tron.getAddress('niles', address);
        return {
          balance: new BigNumber(result.balance),
          tokens: result.tokens,
        };
      default:
        return {
          balance: new BigNumber(0),
        };
    }
  }

  private async getKey(): Promise<Otk> {
    if (!this.otk) {
      this.otk = (await this.storage.get('otk')) as Otk;
    }
    return this.otk;
  }

  private setKeyIdentity(ident: string) {
    if (!this.otk.identity) {
      this.otk.identity = ident;

      // No need to wait
      this.storage.set('otk', this.otk);
    }
  }

  private async keyCreate(
    symbol: string,
    twoFA: boolean
  ): Promise<IBaseTransaction> {
    const txHandler = new TransactionHandler();
    const key = await this.getKey();

    // Build Transaction
    const txBody: IBaseTransaction = {
      $tx: {
        $namespace: Nitr0gen.Namespace,
        $contract: Nitr0gen.Create,
        $i: {
          owner: {
            $stream: key.identity,
            symbol,
            twoFA,
          },
        },
      },
      $sigs: {},
      $selfsign: false,
    };

    // Sign Transaction & Send
    return await txHandler.signTransaction(txBody, key);
  }

  private async diffConsensus(
    nId: string,
    address: string,
    hashes: string[]
  ): Promise<IBaseTransaction> {
    const txHandler = new TransactionHandler();
    const key = await this.getKey();

    // Build Transaction
    const txBody: IBaseTransaction = {
      $tx: {
        $namespace: Nitr0gen.Namespace,
        $contract: Nitr0gen.DiffConsensus,
        $i: {
          owner: {
            $stream: key.identity,
            address,
            hashes,
          },
        },
        $o: {
          key: {
            $stream: nId,
          },
        },
      },
      $sigs: {},
      $selfsign: false,
    };

    // Sign Transaction & Send
    return await txHandler.signTransaction(txBody, key);
  }

  public async updateIdentity(entry: string, cValue: any): Promise<any> {
    const txHandler = new TransactionHandler();
    const key = await this.getKey();

    // Build Transaction
    const txBody: IBaseTransaction = {
      $tx: {
        $namespace: Nitr0gen.Namespace,
        $contract: Nitr0gen.Onboard,
        $entry: `update.${entry}`,
        $i: {
          otk: {
            $stream: key.identity,
            [entry]: cValue,
          },
        },
      },
      $sigs: {},
    };

    // Sign Transaction & Send
    const tx = await txHandler.signTransaction(txBody, key);
    return await lastValueFrom(this.nitr0api.security(tx));
  }

  public async preflight(nId: string, signtx: unknown): Promise<any> {
    const txHandler = new TransactionHandler();
    const key = await this.getKey();

    // Build Transaction
    const txBody: IBaseTransaction = {
      $tx: {
        $namespace: Nitr0gen.Namespace,
        $contract: Nitr0gen.Preflight,
        $i: {
          owner: {
            $stream: key.identity,
            signtx,
          },
        },
        $o: {
          key: {
            $stream: nId,
          },
        },
      },
      $sigs: {},
      $selfsign: false,
    };

    // Sign Transaction & Send
    return await this.nitr0api.wallet.preflight(
      await txHandler.signTransaction(txBody, key)
    );
  }

  public async sign(
    nId: string,
    signtx: unknown,
    twoFA: string
  ): Promise<IBaseTransaction> {
    const txHandler = new TransactionHandler();
    const key = await this.getKey();

    // Build Transaction
    const txBody: any = {
      $territoriality: 'b83b7b3c559e1aa636391dadda9fc60ba330cddc',
      $tx: {
        $namespace: Nitr0gen.Namespace,
        $contract: Nitr0gen.Sign,
        $i: {
          owner: {
            $stream: key.identity,
            twoFA,
            signtx,
          },
        },
        $o: {
          key: {
            $stream: nId,
          },
        },
      },
      $sigs: {},
      $selfsign: false,
    };

    // Sign Transaction & Send
    return await this.nitr0api.wallet.sign(
      await txHandler.signTransaction(txBody, key)
    );
  }

  public async sendTransaction<T>(tx: string, network: string): Promise<T> {
    switch (network) {
      case 'btc':
        console.log('to implement');
      case 'tbtc':
        return this.nitr0api.wallet.bitcoin.sendTransaction('test', tx);
      case 'tbnb':
        return this.nitr0api.wallet.binance.sendTransaction('test', tx);
      case 'ropsten':
        return this.nitr0api.wallet.ethereum.sendTransaction('test', tx);
      case 'shasta':
        return this.nitr0api.wallet.tron.sendTransaction('shasta', tx);
      case 'niles':
        return this.nitr0api.wallet.tron.sendTransaction('niles', tx);
    }
  }
}
