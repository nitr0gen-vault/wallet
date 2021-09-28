import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { SendComponent } from './send.component';
import { SendComponentRoutingModule } from './send-routing.module';
import { QRCodeModule } from 'angularx-qrcode';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    SendComponentRoutingModule,
    QRCodeModule,
  ],
  declarations: [SendComponent],
  exports: [SendComponent],
})
export class SendComponentModule {}
