import {
  IKey,
  KeyHandler,
  KeyType,
  TransactionHandler,
  IBaseTransaction,
} from '@activeledger/sdk';
import { Device } from '@capacitor/device';
import { Injectable, Output } from '@angular/core';
import { lastValueFrom } from 'rxjs/internal/lastValueFrom';
import { StorageService } from './storage.service';
import { Nitr0genApiService } from './nitr0gen-api.service';
import { AlertController, LoadingController } from '@ionic/angular';
import { BigNumber } from 'bignumber.js';
import {
  NativeBiometric,
  AvailableResult,
  BiometryType,
} from 'capacitor-native-biometric';
import { environment } from 'src/environments/environment';

//export type Otk = IKey;

export interface Otk extends IKey {
  biometrics?: boolean;
}

export interface Wallet {
  symbol: string;
  nId: string;
  address: string;
  nonce: number;
  chainId: number;
  hashes: string[];
  tokens: Token[];
  amount?: BigNumber;
  hidden?: boolean;
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
  public rewardToken: Token;
  private loading: HTMLIonLoadingElement;
  public pnt = '';

  //wallet$: Subject<Wallet> = new Subject();

  constructor(
    private storage: StorageService,
    private nitr0api: Nitr0genApiService,
    private loadingControl: LoadingController,
    private alertController: AlertController
  ) {
    (async () => {
      await this.getKey();

      // Setup default for browser
      let bioAvail: AvailableResult = {
        isAvailable: false,
        biometryType: BiometryType.NONE,
      };

      // Catch browser error
      try {
        bioAvail = await NativeBiometric.isAvailable();
      } catch (e) {}

      if (!this.otk) {
        // Time to create
        await this.loader('Creating Device OTK');

        this.otk = await this.generateOtk();
        await this.storage.set('otk', this.otk);
      } else {
        if (bioAvail.isAvailable && this.otk.biometrics) {
          // Check if they used biometrics
          const credentials = await NativeBiometric.getCredentials({
            server: 'nitr0gen.auth',
          });
          console.log(credentials);
          // Authenticate before using the credentials
          try {
            const bioVerify = await NativeBiometric.verifyIdentity({
              reason: 'Gain your access right to Nitr0gen Vault Services',
              title: 'Nitr0gen Authenticate',
              subtitle: 'Unlock your OTK',
              //description: '',
            });
            this.otk = JSON.parse(credentials.password);
            this.otk.biometrics = true; // Make sure it is in the payload
          } catch (e) {
            // errors are {message:string, code:0}
            // maybe loop again, For now panic
            console.log('panic');

            // iOS doesn't like it
            // App.exitApp();
            (
              await this.alertController.create({
                message:
                  'Authentication Failed. Restart Application to try again.',
              })
            ).present();
            return;
          }
        }
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

            // Check and ask if they like to use biometrics
            if (bioAvail.isAvailable) {
              await this.loading.dismiss();
              this.loading = null; // Will get recreated
              await this.getBioSafe();
            }
          } else {
            const error = result as any;
            console.log(error.status);
          }
        }

        console.log('now gettnig wallet check');
        if (!(await this.getWallets()).length) {
          // Now to Create wallets
          await this.loader('Creating Bitcoin Wallet');
          let w = await this.createWallet(
            environment.production ? 'btc' : 'tbtc'
          );
          this.wallet.push(w);

          await this.loader('Creating Ethereum Wallet');
          w = await this.createWallet(
            environment.production ? 'eth' : 'ropsten'
          );
          this.wallet.push(w);

          await this.loader('Creating Binance Wallet');
          w = await this.createWallet(environment.production ? 'bnb' : 'tbnb');
          this.wallet.push(w);

          await this.loader('Creating Binance Reward Simulator');
          w = await this.createWallet('tbnb');
          this.wallet.push(w);

          await this.loader('Creating Tron Wallet');
          w = await this.createWallet(environment.production ? 'trx' : 'niles');
          this.wallet.push(w);

          await this.loader('Settling Locally');
          // allow for faster lookup
          this.fetching = 0;
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

  private getBioSafe(): Promise<Boolean> {
    return new Promise(async (resolve, reject) => {
      const alert = await this.alertController.create({
        header: 'Enable Biometrics',
        message: `Do you want to secure your OTK with biometrics?`,
        buttons: [
          {
            text: 'No',
            role: 'cancel',
            cssClass: 'secondary',
            handler: () => {
              resolve(false);
            },
          },
          {
            text: 'Yes',
            handler: async () => {
              // Store
              await NativeBiometric.setCredentials({
                username: this.otk.identity,
                password: JSON.stringify(this.otk),
                server: 'nitr0gen.auth',
              });

              // Now need to update storage otk
              await this.storage.set('otk', { biometrics: true });
              resolve(true);
            },
          },
        ],
      });
      await alert.present();
    });
  }

  private async createWallet(
    symbol: string
    //  tokens?: Token[]
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
      chainId: results.chainId,
      tokens: results.tokens,
      //  tokens,
    };
  }

  public async getDeviceUuid() {
    return (await Device.getId()).uuid;
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
            uuid: await this.getDeviceUuid(),
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

  public async recacheWallets(wallet: Wallet[]): Promise<void> {
    this.wallet = wallet;
    await this.setWallets();
  }

  public async setWallets(): Promise<void> {
    await this.storage.set('wallet', await this.getWallets());
  }

  private fetching: number = 0;
  private async fetchBalances() {
    if (Date.now() - this.fetching > 30000) {
      this.fetching = Date.now();
      let promises = [];
      for (let i = 0; i < this.wallet.length; i++) {
        const wallet = this.wallet[i];

        //}
        //this.wallet.forEach(async (wallet) => {
        // Get Balance (can we skip await so not stuck on timeouts)
        promises.push(this.fetchBalance(wallet.address, wallet.symbol).then(
          async (balances) => {
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
                token.amount = rToken ? rToken.balance : 0;

                if(wallet.symbol === "tbnb" && token.symbol === "ttv1") {
                  this.rewardToken = token;
                }
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
          }
        ));
      }
      await Promise.all(promises);
      //this.fetching = false;
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
    switch (symbol) {
      case 'tbtc':
        result = await this.nitr0api.wallet.bitcoin.getAddress('test', address);
        return {
          balance: new BigNumber(result.balance),
        };
      case 'btc':
        result = await this.nitr0api.wallet.bitcoin.getAddress('main', address);
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
      case 'eth':
        result = await this.nitr0api.wallet.ethereum.getAddress(
          'main',
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
      case 'bnb':
        result = await this.nitr0api.wallet.binance.getAddress('main', address);
        return {
          balance: new BigNumber(result.balance),
          nonce: result.nonce,
          tokens: result.tokens,
        };
      case 'trx':
        result = await this.nitr0api.wallet.tron.getAddress('main', address);
        return {
          balance: new BigNumber(result.balance),
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

  public forceKeyIdentity(ident: string) {
    this.otk.identity = ident;

    // No need to wait
    if (this.otk.biometrics) {
      // Store
      NativeBiometric.setCredentials({
        username: this.otk.identity,
        password: JSON.stringify(this.otk),
        server: 'nitr0gen.auth',
      });
    } else {
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
        return this.nitr0api.wallet.bitcoin.sendTransaction('main', tx);
      case 'tbtc':
        return this.nitr0api.wallet.bitcoin.sendTransaction('test', tx);
      case 'bnb':
        return this.nitr0api.wallet.binance.sendTransaction('main', tx);
      case 'tbnb':
        return this.nitr0api.wallet.binance.sendTransaction('test', tx);
      case 'eth':
        return this.nitr0api.wallet.ethereum.sendTransaction('main', tx);
      case 'ropsten':
        return this.nitr0api.wallet.ethereum.sendTransaction('test', tx);
      case 'shasta':
        return this.nitr0api.wallet.tron.sendTransaction('shasta', tx);
      case 'niles':
        return this.nitr0api.wallet.tron.sendTransaction('niles', tx);
      case 'trx':
        return this.nitr0api.wallet.tron.sendTransaction('main', tx);
    }
  }

  public async recoveryPreflight(nId: string): Promise<IBaseTransaction> {
    const txHandler = new TransactionHandler();
    const key = await this.getKey();

    // Build Transaction
    const txBody: IBaseTransaction = {
      $tx: {
        $namespace: Nitr0gen.Namespace,
        $contract: Nitr0gen.Onboard,
        $entry: 'recovery.preflight',
        $i: {
          otk: {
            publicKey: key.key.pub.pkcs8pem,
            type: key.type,
          },
        },
        $o: {
          recovery: {
            $stream: nId,
          },
        },
      },
      $sigs: {},
      $selfsign: true,
    };

    // Sign Transaction & Send
    return await txHandler.signTransaction(txBody, { ...key, identity: 'otk' });
  }

  public async recoveryPreValidate(
    nId: string,
    yourCode: string,
    socialCode: string
  ): Promise<IBaseTransaction> {
    const txHandler = new TransactionHandler();
    const key = await this.getKey();

    // Build Transaction
    const txBody: IBaseTransaction = {
      $tx: {
        $namespace: Nitr0gen.Namespace,
        $contract: Nitr0gen.Onboard,
        $entry: 'recovery.validate',
        $i: {
          otk: {
            publicKey: key.key.pub.pkcs8pem,
            type: key.type,
            yourCode,
            socialCode,
          },
        },
        $o: {
          recovery: {
            $stream: nId,
          },
        },
      },
      $sigs: {},
      $selfsign: true,
    };

    // Sign Transaction & Send
    return await txHandler.signTransaction(txBody, { ...key, identity: 'otk' });
  }

  public async pair(uuid: string, otpk: string): Promise<object> {
    const txHandler = new TransactionHandler();
    const key = await this.getKey();

    // Build Transaction
    const txBody: IBaseTransaction = {
      $tx: {
        $namespace: Nitr0gen.Namespace,
        $contract: Nitr0gen.Onboard,
        $entry: 'newdevice',
        $i: {
          otk: {
            $stream: key.identity,
            publicKey: otpk,
            type: key.type,
          },
        },
      },
      $sigs: {},
      $selfsign: false,
    };

    // Sign Transaction & Send
    return lastValueFrom(
      this.nitr0api.otpkApprove(
        await txHandler.signTransaction(txBody, key),
        uuid
      )
    );
  }
}
