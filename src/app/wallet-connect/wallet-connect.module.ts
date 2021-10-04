import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { WalletConnectComponentRoutingModule } from './wallet-connect-routing.module';
import { QRCodeModule } from 'angularx-qrcode';
import { WalletConnectComponent } from './wallet-connect.component';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    WalletConnectComponentRoutingModule,
    QRCodeModule,
  ],
  declarations: [WalletConnectComponent],
  exports: [WalletConnectComponent],
})
export class WalletConnectComponentModule {}
