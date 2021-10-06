import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import {
  BTC_DECIMAL,
  ETH_DECIMAL,
  Nitr0genApiService,
  TRX_DECIMAL,
} from '../service/nitr0gen-api.service';
import { OtkService, Token, Wallet } from '../service/otk.service';

@Component({
  selector: 'app-add-token',
  templateUrl: './add-token.component.html',
  styleUrls: ['./add-token.component.scss'],
})
export class AddTokenComponent implements OnInit {
  public wallet: Wallet = { symbol: '' } as any; //quick hack
  public name: string;
  public symbol: string;
  public decimal: string = '18';
  public contract: string;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    public otk: OtkService,
    private nitr0gen: Nitr0genApiService
  ) {
    const id = this.route.snapshot.params['id'];
  }

  async ngOnInit() {
    const id = this.route.snapshot.params['id'];
    const wallets = await this.otk.getWallets();

    wallets.forEach((wallet) => {
      if (wallet.nId === id) {
        this.wallet = { ...wallet };
      }
    });
    console.log(this.wallet);
  }

  ngOnDestroy() {}

  async save() {
    // Need to do validation and form control in all locations
    if (this.name && this.symbol && this.decimal && this.contract) {
      const result = await this.nitr0gen.wallet.addToken(
        this.wallet.address,
        this.name,
        this.symbol,
        parseInt(this.decimal),
        this.contract
      );

      if (result) {
        this.wallet.tokens.push(result as Token);
        this.otk.refreshWallets();
        this.router.navigate(['tabs', 'tab2']);
      }
    }
  }

  cancel() {
    this.name = this.symbol = this.contract = '';
    this.decimal = '18';
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
}
