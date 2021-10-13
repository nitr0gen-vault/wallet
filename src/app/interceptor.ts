import {
  HttpInterceptor,
  HttpRequest,
  HttpHandler,
  HttpEvent,
} from '@angular/common/http';
import { Injectable } from '@angular/core';
import { lastValueFrom, from, Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { OtkService } from './service/otk.service';

@Injectable()
export class Interceptor implements HttpInterceptor {
  private uuid;

  // Can we inject?
  constructor(private otk: OtkService) {

  }

  public async getUuid() {
    return await this.otk.getDeviceUuid();
    // We actually want unique for every install this sometimes isn't
    // if (!this.uuid) {
    //   this.uuid = (await Device.getId()).uuid;
    // }
    // return this.uuid;
  }

  intercept(
    req: HttpRequest<any>,
    next: HttpHandler
  ): Observable<HttpEvent<any>> {
    // convert promise to observable using 'from' operator
    return from(this.handle(req, next)) as Observable<HttpEvent<any>>;
  }

  async handle(req: HttpRequest<any>, next: HttpHandler) {
    if (req.url.indexOf(environment.api.serverUrl) !== -1) {
      const modifiedReq = req.clone({
        headers: req.headers.set('x-api-uuid', await this.getUuid()),
      });
      return lastValueFrom(next.handle(modifiedReq));
    } else {
      return lastValueFrom(next.handle(req));
    }
  }
}
