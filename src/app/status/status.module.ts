import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { StatusComponentRoutingModule } from './status-routing.module';
import { QRCodeModule } from 'angularx-qrcode';
import { StatusComponent } from './status.component';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    StatusComponentRoutingModule,
    QRCodeModule,
  ],
  declarations: [StatusComponent],
  exports: [StatusComponent],
})
export class StatusComponentModule {}
