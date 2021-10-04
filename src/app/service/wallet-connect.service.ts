// For now use this, Later switch out to Ionic Storage
import KeyValueStorage from 'keyvaluestorage';
import WalletConnectClient, { CLIENT_EVENTS } from '@walletconnect/client';
import {
  PairingTypes,
  SessionTypes,
  SequenceTypes,
} from '@walletconnect/types';
import { Injectable } from '@angular/core';
import { AlertController, LoadingController } from '@ionic/angular';
import { OtkService, Wallet } from './otk.service';
import { Browser } from '@capacitor/browser';

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
  client: WalletConnectClient;
  public wallet: Wallet;

  // Need a better way maybe events / observables
  // However we can piggy back of Angular
  requests = {
    connection: null as any,
    eth_sendTransaction: null as any,
  };

  established = {
    connections: [] as any,
  };

  constructor(
    private otk: OtkService,
    private alertController: AlertController,
    private loadingController: LoadingController
  ) {
    (async () => {
      this.client = await WalletConnectClient.init({
        controller: true,
        relayProvider: 'wss://relay.walletconnect.org',
        metadata: {
          name: 'Nitr0gen',
          description: '',
          url: '#',
          icons: ['https://walletconnect.org/walletconnect-logo.png'],
        },
        storageOptions: {
          asyncStorage: new KeyValueStorage() as any,
        },
      });

      this.client.on(
        CLIENT_EVENTS.session.proposal,
        async (proposal: SessionTypes.Proposal) => {
          // user should be prompted to approve the proposed session permissions displaying also dapp metadata
          const { proposer, permissions } = proposal;
          const { metadata } = proposer;
          let approved: boolean;
          this.handleSessionUserApproval(approved, proposal); // described in the step 4
        }
      );

      this.client.on(
        CLIENT_EVENTS.session.created,
        async (session: SessionTypes.Created) => {}
      );

      this.client.on(
        CLIENT_EVENTS.session.request,
        async (requestEvent: SessionTypes.RequestEvent) => {
          console.log(requestEvent);
          // WalletConnect client can track multiple sessions
          // assert the topic from which application requested
          const { topic, request } = requestEvent;
          const session = await this.client.session.get(requestEvent.topic);
          console.log(session);

          // Fetch the wallet
          this.wallet = await this.findWallet(
            requestEvent.request.params[0].from
          );

          console.log(requestEvent.request.params[0].from);
          console.log(this.wallet);

          // now you can display to the user for approval using the stored metadata
          //const { metadata } = session.peer;

          switch (requestEvent.request.method) {
            case 'eth_sendTransaction':
              this.requests.eth_sendTransaction = {
                event: requestEvent,
                session,
              };

              this.allowHandler = async (result) => {
                const response = {
                  topic,
                  response: {
                    id: request.id,
                    jsonrpc: '2.0',
                    result,
                  },
                };
                await this.client.respond(response);
              };

              this.denyHandler = async () => {
                const response = {
                  topic,
                  response: {
                    id: request.id,
                    jsonrpc: '2.0',
                    error: {
                      code: -32000,
                      message: 'User rejected JSON-RPC request',
                    },
                  },
                };
                await this.client.respond(response);
              };

              break;
          }
        }
      );
    })();
  }

  async findWallet(from: any): Promise<Wallet> {
    const wallets = await this.otk.getWallets();
    for (let i = wallets.length; i--; ) {
      if (wallets[i].address === from) {
        return wallets[i];
      }
    }
  }

  private loading: HTMLIonLoadingElement;

  public connect(uri: string) {
    this.client.pair({ uri });
  }

  private allowHandler: Function;

  public async allow(type: string, result: any) {
    await this.allowHandler(result);

    switch (type) {
      case 'connect':
        this.requests.connection = null;
        break;
      case 'eth_sendTransaction':
        this.requests.eth_sendTransaction = null;
    }
  }

  public async getSignature() {
    const { eip, chainId } =
      this.requests.eth_sendTransaction.event.chainId.split(':');
    const txSig = {
      to: this.requests.eth_sendTransaction.event.request.params[0].to,
      from: this.wallet.address,
      amount: this.requests.eth_sendTransaction.event.request.params[0].value,
      nonce: this.requests.eth_sendTransaction.event.request.params[0].nonce,
      gas: this.requests.eth_sendTransaction.event.request.params[0].gasPrice,
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
  public async deny(type: string) {
    await this.denyHandler();

    switch (type) {
      case 'connect':
        this.requests.connection = null;
        break;
      case 'eth_sendTransaction':
        this.requests.eth_sendTransaction = null;
    }
  }

  public async handleSessionUserApproval(
    approved: boolean,
    proposal: any // Partial<SequenceTypes.Proposal>
  ) {
    // Lets support first one at the moment
    console.log(proposal);
    this.requests.connection = proposal;
    const chain = proposal.permissions.blockchain.chains[0];
    if (SUPPORTED_CHAINS.indexOf(chain) !== -1) {
      this.denyHandler = async () => {
        await this.client.reject({ proposal });
      };

      // AW *** Need to send accounts correctly

      this.allowHandler = async (a) => {
        // if user approved then include response with accounts matching the chains and wallet metadata
        const wallets = await this.otk.getWallets();
        const accounts = [];
        for (let i = wallets.length; i--; ) {
          const chainId = this.symbol2ChainId(wallets[i].symbol);
          if (chainId) {
            accounts.push(`eip155:${chainId}:${wallets[i].address}`);
          }
        }
        const response: SessionTypes.ResponseInput = {
          state: {
            //  accounts: ['eip155:42:0x06c1C7F9687ce988A377001B0BeE83b7fD705947'],
            accounts,
          },
          metadata: {
            name: 'Nitr0gen Wallet',
            description: 'Nitr0gen Wallet for WalletConnect',
            url: 'https://walletconnect.org/',
            icons: ['https://walletconnect.org/walletconnect-logo.png'],
          },
        };
        await this.client.approve({ proposal, response });
      };
    }
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
      this.loading.dismiss();
      this.allow('eth_sendTransaction', rawTxHex);
    }
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

  private symbol2ChainId(symbol: string): string | null {
    switch (symbol) {
      case 'tbnb':
        return '97';
      case 'ropsten':
        return '3';
      default:
        return null;
    }
  }
}
