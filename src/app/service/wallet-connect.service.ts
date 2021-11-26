// For now use this, Later switch out to Ionic Storage
import WalletConnect from '@walletconnect/client';

// V2
//import WalletConnectClient, { CLIENT_EVENTS } from '@walletconnect/client';
// import {
//   PairingTypes,
//   SessionTypes,
//   SequenceTypes,
// } from '@walletconnect/types';
import { EventEmitter, Injectable } from '@angular/core';
import { AlertController, LoadingController } from '@ionic/angular';
import { OtkService, Wallet } from './otk.service';
import { Browser } from '@capacitor/browser';
import {
  ETH_GWEI_DECIMAL,
  FeePricing,
  Nitr0genApiService,
} from './nitr0gen-api.service';

export const SUPPORTED_CHAINS = [
  // mainnets
  'eip155:1',
  'eip155:10',
  // testnets
  'eip155:42',
];

@Injectable({
  providedIn: 'root',
})
export class WalletConnectService {
  history = [];
  client: WalletConnect;
  public wallet: Wallet;
  displayFees: FeePricing = {} as any;
  fees: FeePricing;
  feeSymbol = '';
  selectedFee = 'medium';
  disconnected: EventEmitter<boolean> = new EventEmitter();

  // Need a better way maybe events / observables
  // However we can piggy back of Angular
  requests = {
    session: null as any,
    connection: null as any,
    pending: false,
    eth_sendTransaction: null as any,
    eth_sign: null as any,
    eth_signTypedData: null as any,
  };

  established = {
    connections: [] as any,
  };

  constructor(
    private otk: OtkService,
    private alertController: AlertController,
    private loadingController: LoadingController,
    private nitr0api: Nitr0genApiService
  ) {
    (async () => {
      const wc = localStorage.getItem('walletconnect');
      if (wc) {
        console.log('Loading WalletConnect Session');
        this.requests.session = JSON.parse(wc);
        this.client = new WalletConnect({
          // Required
          session: this.requests.session,
          // Required
          clientMeta: {
            description: '',
            url: '#',
            icons: ['https://walletconnect.org/walletconnect-logo.png'],
            name: 'Nitr0gen',
          },
        });
        this.subscribe();
      }
    })();
    // V2
    // (async () => {
    //   this.client = await WalletConnectClient.init({
    //     controller: true,
    //     relayProvider: 'wss://relay.walletconnect.org',
    //     metadata: {
    //       name: 'Nitr0gen',
    //       description: '',
    //       url: '#',
    //       icons: ['https://walletconnect.org/walletconnect-logo.png'],
    //     },
    //     storageOptions: {
    //       asyncStorage: new KeyValueStorage() as any,
    //     },
    //   });
    //   this.client.on(
    //     CLIENT_EVENTS.session.proposal,
    //     async (proposal: SessionTypes.Proposal) => {
    //       // user should be prompted to approve the proposed session permissions displaying also dapp metadata
    //       const { proposer, permissions } = proposal;
    //       const { metadata } = proposer;
    //       let approved: boolean;
    //       this.handleSessionUserApproval(approved, proposal); // described in the step 4
    //     }
    //   );
    //   this.client.on(
    //     CLIENT_EVENTS.session.created,
    //     async (session: SessionTypes.Created) => {}
    //   );
    //   this.client.on(
    //     CLIENT_EVENTS.session.request,
    //     async (requestEvent: SessionTypes.RequestEvent) => {
    //       console.log(requestEvent);
    //       // WalletConnect client can track multiple sessions
    //       // assert the topic from which application requested
    //       const { topic, request } = requestEvent;
    //       const session = await this.client.session.get(requestEvent.topic);
    //       console.log(session);
    //       // Fetch the wallet
    //       this.wallet = await this.findWallet(
    //         requestEvent.request.params[0].from
    //       );
    //       console.log(requestEvent.request.params[0].from);
    //       console.log(this.wallet);
    //       // now you can display to the user for approval using the stored metadata
    //       //const { metadata } = session.peer;
    //       switch (requestEvent.request.method) {
    //         case 'eth_sendTransaction':
    //           this.requests.eth_sendTransaction = {
    //             event: requestEvent,
    //             session,
    //           };
    //           this.allowHandler = async (result) => {
    //             const response = {
    //               topic,
    //               response: {
    //                 id: request.id,
    //                 jsonrpc: '2.0',
    //                 result,
    //               },
    //             };
    //             await this.client.respond(response);
    //           };
    //           this.denyHandler = async () => {
    //             const response = {
    //               topic,
    //               response: {
    //                 id: request.id,
    //                 jsonrpc: '2.0',
    //                 error: {
    //                   code: -32000,
    //                   message: 'User rejected JSON-RPC request',
    //                 },
    //               },
    //             };
    //             await this.client.respond(response);
    //           };
    //           break;
    //       }
    //     }
    //   );
    // })();
  }

  async findWallet(from: any): Promise<Wallet> {
    const wallets = await this.otk.getWallets();
    for (let i = wallets.length; i--; ) {
      if (wallets[i].address.toLowerCase() === from.toLowerCase()) {
        return wallets[i];
      }
    }
  }

  private loading: HTMLIonLoadingElement;

  public async disconnect() {
    if (this.client) {
      // need to resolve the event handling better
      this.disconnected.emit(true);
      this.requests.session = null;      
      await this.client.killSession();
      localStorage.removeItem('walletconnect');
      this.client = null;
    }
  }

  public connect(uri: string) {
    // V2
    //this.client.pair({ uri });

    // This version doesn't do session managament so we may need to handle this differently
    this.client = new WalletConnect({
      // Required
      uri,
      // Required
      clientMeta: {
        description: '',
        url: '#',
        icons: ['https://walletconnect.org/walletconnect-logo.png'],
        name: 'Nitr0gen',
      },
    });
    //this.requests.session = this.client.session;
    //console.log(this.client.session);
    this.subscribe();
  }

  public subscribe() {
    // Subscribe to session requests
    this.client.on('session_request', (error, payload) => {
      if (error) {
        throw error;
      }
      console.log('WC Session Request :');
      console.log(payload);
      this.requests.session = payload.params[0];

      // Handle Session Request using V2 type object passthrough
      this.requests.connection = {
        proposer: {
          metadata: {
            name: payload.params[0].peerMeta.name,
            description: payload.params[0].peerMeta.description,
            icons: payload.params[0].peerMeta.icons,
            url: payload.params[0].peerMeta.url,
          },
        },
      };

      const sessionChainId = payload.params[0].chainId || 1;

      this.denyHandler = async () => {
        this.client.rejectSession({
          // message: 'OPTIONAL_ERROR_MESSAGE'
        });
      };

      this.allowHandler = async (a) => {
        // if user approved then include response with accounts matching the chains and wallet metadata
        const wallets = await this.otk.getWallets();
        const accounts = new Set(); // Quick solution to duplicate wallet bug
        for (let i = wallets.length; i--; ) {
          //const chainId = this.symbol2ChainId(wallets[i].symbol);
          if (this.checkWalletSessionId(wallets[i], sessionChainId)) {
            //if (chainId === sessionChainId.toString()) {
            accounts.add(wallets[i].address);
          }
        }

        const response = {
          accounts: [...accounts] as string[],
          chainId: sessionChainId,
        };
        console.log('WC Approved :');
        console.log(response);

        this.client.approveSession(response);
      };
    });

    // Subscribe to call requests
    this.client.on('call_request', async (error, payload) => {
      if (error) {
        throw error;
      }

      // Handle Call Request
      console.log('WC Call Request :');
      console.log(payload);
      console.log(this.requests.session);

      switch (payload.method) {
        case 'eth_sign':
          this.wallet = await this.findWallet(payload.params[0]);
          console.log(this.wallet);

          this.requests.eth_sign = {
            event: {
              request: payload,
            },
            session: {
              peer: {
                metadata: this.requests.session.peerMeta,
              },
            },
          };
          this.requests.pending = true;

          this.allowHandler = async (result) => {
            console.log('WC Approved :');
            console.log(result);
            this.client.approveRequest({
              id: payload.id,
              jsonrpc: '2.0',
              result,
            });
          };

          this.denyHandler = async () => {
            console.log('Sending Reject Back');
            this.client.rejectRequest({
              id: payload.id,
              error: {
                message: 'Not Implemented',
              },
            });
          };
          break;
        case 'eth_signTypedData':
          this.wallet = await this.findWallet(payload.params[0]);
          console.log(this.wallet);

          console.log(this.requests.session);
          this.requests.eth_signTypedData = {
            event: {
              request: payload,
            },
            session: {
              peer: {
                metadata: this.requests.session.peerMeta,
              },
            },
          };
          this.requests.pending = true;

          this.allowHandler = async (result) => {
            console.log('WC Approved :');
            console.log(result);
            this.client.approveRequest({
              id: payload.id,
              jsonrpc: '2.0',
              result,
            });
          };

          this.denyHandler = async () => {
            console.log('Sending Reject Back');
            this.client.rejectRequest({
              id: payload.id,
              error: {
                message: 'Not Implemented',
              },
            });
          };
          break;
        case 'eth_sendTransaction':
          this.wallet = await this.findWallet(payload.params[0].from);
          console.log(payload.params[0].from);
          console.log(this.wallet);

          // Our gas fee solution
          switch (this.wallet.symbol) {
            case 'ropsten':
              //BigNumber.config({ DECIMAL_PLACES: 3 });
              this.feeSymbol = 'gwei';
              this.fees = await this.nitr0api.wallet.ethereum.getFee('test');
              this.displayFees = {
                low: parseFloat((this.fees.low / ETH_GWEI_DECIMAL).toFixed(2)),
                medium: parseFloat(
                  (this.fees.medium / ETH_GWEI_DECIMAL).toFixed(2)
                ),
                high: parseFloat(
                  (this.fees.high / ETH_GWEI_DECIMAL).toFixed(2)
                ),
              };

              break;
            case 'eth':
              //BigNumber.config({ DECIMAL_PLACES: 3 });
              this.feeSymbol = 'gwei';
              this.fees = await this.nitr0api.wallet.ethereum.getFee('main');

              this.displayFees = {
                low: parseFloat((this.fees.low / ETH_GWEI_DECIMAL).toFixed(2)),
                medium: parseFloat(
                  (this.fees.medium / ETH_GWEI_DECIMAL).toFixed(2)
                ),
                high: parseFloat(
                  (this.fees.high / ETH_GWEI_DECIMAL).toFixed(2)
                ),
              };
              break;
            case 'tbnb':
              //BigNumber.config({ DECIMAL_PLACES: 3 });
              this.feeSymbol = 'gwei';
              this.fees = await this.nitr0api.wallet.binance.getFee('test');

              this.displayFees = {
                low: parseFloat((this.fees.low / ETH_GWEI_DECIMAL).toFixed(2)),
                medium: parseFloat(
                  (this.fees.medium / ETH_GWEI_DECIMAL).toFixed(2)
                ),
                high: parseFloat(
                  (this.fees.high / ETH_GWEI_DECIMAL).toFixed(2)
                ),
              };
              break;
            case 'bnb':
              //BigNumber.config({ DECIMAL_PLACES: 3 });
              this.feeSymbol = 'gwei';
              this.fees = await this.nitr0api.wallet.binance.getFee('main');

              this.displayFees = {
                low: parseFloat((this.fees.low / ETH_GWEI_DECIMAL).toFixed(2)),
                medium: parseFloat(
                  (this.fees.medium / ETH_GWEI_DECIMAL).toFixed(2)
                ),
                high: parseFloat(
                  (this.fees.high / ETH_GWEI_DECIMAL).toFixed(2)
                ),
              };
              break;
          }

          console.log(this.requests.session);
          this.requests.eth_sendTransaction = {
            event: {
              request: payload,
            },
            session: {
              peer: {
                metadata: this.requests.session.peerMeta,
              },
            },
          };
          this.requests.pending = true;

          console.log(this.requests.eth_sendTransaction);

          this.allowHandler = async (result) => {
            console.log('WC Approved :');
            console.log(result);
            this.client.approveRequest({
              id: payload.id,
              jsonrpc: '2.0',
              result,
            });
          };

          this.denyHandler = async (message = 'Rejected Transfer') => {
            console.log('Sending Reject Back');
            this.client.rejectRequest({
              id: payload.id,
              error: {
                message,
              },
            });
          };

          break;

        default:
          // Reject until others supported
          break;
      }
    });

    this.client.on('disconnect', (error, payload) => {
      if (error) {
        throw error;
      }
      console.log('Disconnecting');
      console.log(payload);
      // Delete connector
      this.disconnect();
    });
  }

  private allowHandler: Function;

  public async allow(type: string, result?: any) {
    await this.allowHandler(result);

    switch (type) {
      case 'connect':
        this.requests.connection = null;
        this.requests.session = this.client.session;
        break;
      case 'eth_sendTransaction':
        this.requests.eth_sendTransaction = null;
        this.requests.pending = false;
        break;
      case 'eth_sign':
        this.requests.eth_sign = null;
        this.requests.pending = false;
        break;
      case 'eth_signTypedData':
        this.requests.eth_signTypedData = null;
        this.requests.pending = false;
        break;
    }
  }

  public async getSignature() {
    // V2
    // const { eip, chainId } =
    //   this.requests.eth_sendTransaction.event.chainId.split(':');
    const chainId = this.requests.session.chainId;
    const txSig = {
      to: this.requests.eth_sendTransaction.event.request.params[0].to,
      from: this.requests.eth_sendTransaction.event.request.params[0].from,
      amount: this.requests.eth_sendTransaction.event.request.params[0].value,
      nonce:
        this.requests.eth_sendTransaction.event.request.params[0].nonce ||
        this.wallet.nonce,
      gas:
        this.fees[this.selectedFee] ||
        this.requests.eth_sendTransaction.event.request.params[0].gasPrice,
      gasLimit:
        this.requests.eth_sendTransaction.event.request.params[0].gas || null,
      data: this.requests.eth_sendTransaction.event.request.params[0].data,
      chainId,
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
        this.getTwoFA(txSig);
      } else {
        this.procressSign(txSig, null);
      }
    }
    //}
  }

  private denyHandler: Function;
  public async deny(type: string, message?: string) {
    await this.denyHandler(message);

    switch (type) {
      case 'connect':
        this.requests.connection = null;
        this.requests.session = null;
        break;
      case 'eth_sendTransaction':
        this.requests.eth_sendTransaction = null;
        this.requests.pending = false;
        break;
      case 'eth_sign':
        this.requests.eth_sign = null;
        this.requests.pending = false;
        break;
      case 'eth_signTypedData':
        this.requests.eth_signTypedData = null;
        this.requests.pending = false;
        break;
    }
  }

  // V2
  // public async handleSessionUserApproval(
  //   approved: boolean,
  //   proposal: any // Partial<SequenceTypes.Proposal>
  // ) {
  //   // Lets support first one at the moment
  //   console.log(proposal);
  //   this.requests.connection = proposal;
  //   const chain = proposal.permissions.blockchain.chains[0];
  //   if (SUPPORTED_CHAINS.indexOf(chain) !== -1) {
  //     this.denyHandler = async () => {
  //       await this.client.reject({ proposal });
  //     };

  //     this.allowHandler = async (a) => {
  //       // if user approved then include response with accounts matching the chains and wallet metadata
  //       const wallets = await this.otk.getWallets();
  //       const accounts = [];
  //       for (let i = wallets.length; i--; ) {
  //         const chainId = this.symbol2ChainId(wallets[i].symbol);
  //         if (chainId) {
  //           accounts.push(`eip155:${chainId}:${wallets[i].address}`);
  //         }
  //       }
  //       const response: SessionTypes.ResponseInput = {
  //         state: {
  //           //  accounts: ['eip155:42:0x06c1C7F9687ce988A377001B0BeE83b7fD705947'],
  //           accounts,
  //         },
  //         metadata: {
  //           name: 'Nitr0gen Vault',
  //           description: 'Nitr0gen Vault for WalletConnect',
  //           url: 'https://walletconnect.org/',
  //           icons: ['https://walletconnect.org/walletconnect-logo.png'],
  //         },
  //       };
  //       await this.client.approve({ proposal, response });
  //     };
  //   }
  // }

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

      let reply = (await this.otk.sendTransaction(
        rawTxHex,
        this.wallet.symbol
      )) as any;

      console.log(reply);

      this.loadingController.dismiss();

      const txId = reply.hash;
      if (txId) {
        this.allow('eth_sendTransaction', txId);
        await this.transactionCompleted(txId);
      } else {
        let message = '';
        if (reply.body) {
          let body = JSON.parse(reply.body);
          message = body.error.message;
        }
        this.deny('eth_sendTransaction', message);
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

  private checkWalletSessionId(
    wallet: Wallet,
    sessionChainId: number
  ): boolean {
    if (this.symbol2Eth(wallet.symbol)) {
      if (sessionChainId) {
        return this.symbol2ChainId(wallet.symbol) === sessionChainId;
      } else {
        return true;
      }
    }
  }

  private symbol2Eth(symbol: string): boolean {
    switch (symbol) {
      case 'bnb':
      case 'tbnb':
      case 'ropsten':
      case 'ht':
      case 'htt':
      case 'xdai':
      case 'okt':
      case 'ftm':
      case 'matic':
      case 'avax':
        return true;
      default:
        return false;
    }
  }

  private symbol2ChainId(symbol: string): number | null {
    switch (symbol) {
      case 'eth':
        return 1;
      case 'ropsten':
        return 3;
      case 'bnb':
        return 56;
      case 'tbnb':
        return 97;
      case 'ht':
        return 128;
      case 'htt':
        return 256;
      case 'xdai':
        return 10;
      case 'okt':
        return 66;
      case 'ftm':
        return 250;
      case 'matic':
        return 137;
      case 'avax':
        return 43114;
      //return 3;
      default:
        return null;
    }
  }
}
