import { Component } from '@angular/core';
import { Otk, OtkService } from '../service/otk.service';
import { StorageService } from '../service/storage.service';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
})
export class HomePage {
  constructor(
    public storage: StorageService,
    private otkService: OtkService
  ) {}

  async ngOnInit() {
        
  }
}
