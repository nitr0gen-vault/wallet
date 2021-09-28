import { Component, HostListener, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { OtkService, Wallet } from '../service/otk.service';

@Component({
  selector: 'app-send',
  templateUrl: './send.component.html',
  styleUrls: ['./send.component.scss'],
})
export class SendComponent implements OnInit, OnDestroy {
  wallet: Wallet = {} as any;
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
    const id = this.route.snapshot.params['id'];
    const token = this.route.snapshot.params['token'];
    const wallets = await this.otk.getWallets();

    wallets.forEach((wallet) => {
      if (wallet.nId === id) {
        
        this.wallet = {...wallet, symbol: token};
      }
    });
  }

  ngOnDestroy() {
     this.address = this.amount = "";
     this.wallet = {} as any;
  }

  public send() {
    console.log(this.amount);
    console.log(this.address);

  }

  public cancel() {
    this.router.navigate(['tabs', 'tab2']);
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
