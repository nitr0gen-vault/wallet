import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { ContractsRoutingModule } from './contracts-routing.module';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { ContractsComponent } from './contracts.component';


@NgModule({
  declarations: [ContractsComponent],
  imports: [
    IonicModule,
    CommonModule,
    FormsModule,
    ContractsRoutingModule
  ]
})
export class ContractsModule { }
