import { TestBed } from '@angular/core/testing';

import { OtkService } from './otk.service';

describe('OtkService', () => {
  let service: OtkService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(OtkService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
