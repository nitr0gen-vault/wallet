import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { WalletPage } from './wallet.page';
import { ExploreContainerComponentModule } from '../explore-container/explore-container.module';
import { SwiperModule } from 'swiper/angular';
import { QRCodeModule } from 'angularx-qrcode';

import { WalletPageRoutingModule } from './wallet-routing.module';

@NgModule({
  imports: [
    SwiperModule,
    QRCodeModule,
    IonicModule,
    CommonModule,
    FormsModule,
    ExploreContainerComponentModule,
    WalletPageRoutingModule,
  ],
  declarations: [WalletPage]
})
export class WalletPageModule {}
