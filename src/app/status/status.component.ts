import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { ETH_DECIMAL, TRX_DECIMAL } from '../service/nitr0gen-api.service';
import { Wallet, OtkService } from '../service/otk.service';

@Component({
  selector: 'app-status',
  templateUrl: './status.component.html',
  styleUrls: ['./status.component.scss'],
})
export class StatusComponent implements OnInit {
  wallet: Wallet = {symbol:""} as any; //quick hack
  amount: string;
  address: string;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    public otk: OtkService
  ) {
    const id = this.route.snapshot.params['id'];
  }

  async ngOnInit() {
    console.log("STATUS");
    const id = this.route.snapshot.params['id'];
    const wallets = await this.otk.getWallets();

    wallets.forEach((wallet) => {
      if (wallet.nId === id) {
        this.wallet = { ...wallet};
      }
    });
    console.log(this.wallet);    
  }

  ngOnDestroy() {
    this.address = this.amount = '';
    this.wallet = {} as any;
  }

  // Stop copying pasting this put it somewhere else!

  getAmount(wallet: Wallet): string {
    if (wallet.amount) {
      switch (wallet.symbol) {
        case 'tbtc':
        case 'btc':
          return wallet.amount.dividedBy(ETH_DECIMAL).toString();
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
