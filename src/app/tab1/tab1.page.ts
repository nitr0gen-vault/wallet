import { Component } from '@angular/core';
import { Otk, OtkService } from '../service/otk.service';
import { StorageService } from '../service/storage.service';

@Component({
  selector: 'app-tab1',
  templateUrl: 'tab1.page.html',
  styleUrls: ['tab1.page.scss'],
})
export class Tab1Page {
  constructor(
    public storage: StorageService,
    private otkService: OtkService
  ) {}

  async ngOnInit() {
        
  }
}
