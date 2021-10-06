import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { AddTokenComponent } from './add-token.component';
import { AddTokenComponentRoutingModule } from './add-token-routing.module';
import { QRCodeModule } from 'angularx-qrcode';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    AddTokenComponentRoutingModule,
    QRCodeModule,
  ],
  declarations: [AddTokenComponent],
  exports: [AddTokenComponent],
})
export class AddTokenComponentModule {}
