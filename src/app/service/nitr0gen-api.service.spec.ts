import { TestBed } from '@angular/core/testing';

import { Nitr0genApiService } from './nitr0gen-api.service';

describe('Nitr0genApiService', () => {
  let service: Nitr0genApiService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Nitr0genApiService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
