import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment';
import { HttpClient } from '@angular/common/http';
import { lastValueFrom } from 'rxjs/internal/lastValueFrom';
import { IBaseTransaction } from '@activeledger/sdk';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class Nitr0genApiService {
  public wallet: Wallet;
  constructor(private http: HttpClient) {
    this.wallet = new Wallet(http);
  }

  public get(): Observable<Object> {
    return this.http.get(`${environment.api.serverUrl}/user`);
  }

  /**
   *
   * Keep Observable here for catching error piping (may change)
   *
   * @param {string} otkPem
   * @param {IBaseTransaction} ntx
   * @returns {Observable<Object>}
   * @memberof SummitApiService
   */
  public create(
    otkPem: string,
    ntx: IBaseTransaction
  ): Observable<{ nId: string }> {
    return this.http.post<{ nId: string }>(`${environment.api.serverUrl}/otk`, {
      otpk: otkPem,
      ntx,
    });
  }

  public recovery(ntx: IBaseTransaction): Observable<Object> {
    return this.http.post(`${environment.api.serverUrl}/otk/recovery`, {
      ntx,
    });
  }

  public security(ntx: IBaseTransaction): Observable<Object> {
    return this.http.post(`${environment.api.serverUrl}/otk/security`, {
      ntx,
    });
  }
}

class Wallet {
  public bitcoin: Bitcoin;
  public binance: Binance;
  public ethereum: Ethereum;
  public tron: Tron;
  constructor(private http: HttpClient) {
    this.bitcoin = new Bitcoin(http);
    this.binance = new Binance(http);
    this.ethereum = new Ethereum(http);
    this.tron = new Tron(http);
  }

  public async add(
    symbol: string,
    nId: string,
    ntx: IBaseTransaction
  ): Promise<any> {
    return await lastValueFrom(
      this.http.post<any>(`${environment.api.serverUrl}/wallet/`, {
        key: {
          symbol,
          nId
        },
        ntx,
      })
    );
  }

  public async diffConsensus(ntx: IBaseTransaction): Promise<any> {
    return await lastValueFrom(
      this.http.post<any>(`${environment.api.serverUrl}/wallet/diffconsensus`, {
        ntx,
      })
    );
  }

  public async preflight(ntx: IBaseTransaction): Promise<any> {
    return await lastValueFrom(
      this.http.post<any>(`${environment.api.serverUrl}/wallet/preflight`, {
        ntx,
      })
    );
  }

  public async sign(ntx: IBaseTransaction): Promise<any> {
    return await lastValueFrom(
      this.http.post<any>(`${environment.api.serverUrl}/wallet/sign`, {
        ntx,
      })
    );
  }
}

type BitcoinNetwork = 'test' | 'main';
class Bitcoin {
  constructor(private http: HttpClient) {}

  public async createTx(
    network: BitcoinNetwork,
    input: string,
    output: string,
    value: number
  ): Promise<any> {
    return await lastValueFrom(
      this.http.post<any>(
        `${environment.api.serverUrl}/bitcoin/${network}/create`,
        {
          inputs: [{ addresses: [input] }],
          outputs: [{ addresses: [output], value }],
        }
      )
    );
  }

  public async getAddress(
    network: BitcoinNetwork,
    address: string
  ): Promise<any> {
    return await lastValueFrom(
      this.http.get<any>(
        `${environment.api.serverUrl}/bitcoin/${network}/${address}`
      )
    );
  }

  public async sendTransaction(
    network: BitcoinNetwork,
    hex: string
  ): Promise<any> {
    return await lastValueFrom(
      this.http.post<any>(
        `${environment.api.serverUrl}/bitcoin/${network}/send`,
        {
          hex,
        }
      )
    );
  }
}

type BinanceNetwork = 'test' | 'main';
class Binance {
  constructor(private http: HttpClient) {}

  public async getFee(network: BinanceNetwork): Promise<FeePricing> {
    return await lastValueFrom(
      this.http.get<FeePricing>(
        `${environment.api.serverUrl}/binance/${network}/fee`
      )
    );
  }

  public async getAddress(
    network: BinanceNetwork,
    address: string
  ): Promise<any> {
    return await lastValueFrom(
      this.http.get<any>(
        `${environment.api.serverUrl}/binance/${network}/${address}`
      )
    );
  }

  public async sendTransaction(
    network: BinanceNetwork,
    hex: string
  ): Promise<any> {
    return await lastValueFrom(
      this.http.post<any>(
        `${environment.api.serverUrl}/binance/${network}/send`,
        {
          hex,
        }
      )
    );
  }
}

type EthereumNetwork = 'test' | 'main';
class Ethereum {
  constructor(private http: HttpClient) {}

  public async getFee(network: EthereumNetwork): Promise<FeePricing> {
    return await lastValueFrom(
      this.http.get<FeePricing>(
        `${environment.api.serverUrl}/ethereum/${network}/fee`
      )
    );
  }

  public async getAddress(
    network: EthereumNetwork,
    address: string
  ): Promise<any> {
    return await lastValueFrom(
      this.http.get<any>(
        `${environment.api.serverUrl}/ethereum/${network}/${address}`
      )
    );
  }

  public async sendTransaction(
    network: EthereumNetwork,
    hex: string
  ): Promise<any> {
    return await lastValueFrom(
      this.http.post<any>(
        `${environment.api.serverUrl}/ethereum/${network}/send`,
        {
          hex,
        }
      )
    );
  }
}

type TronNetwork = 'shasta' | 'main' | 'niles';
class Tron {
  constructor(private http: HttpClient) {}

  public async createTx(
    network: TronNetwork,
    to: string,
    from: string,
    amount: number
  ): Promise<any> {
    return await lastValueFrom(
      this.http.post<any>(
        `${environment.api.serverUrl}/tron/${network}/create`,
        {
          to,
          from,
          amount,
        }
      )
    );
  }

  public async createTrc20(
    network: TronNetwork,
    to: string,
    from: string,
    amount: string,
    contract: string
  ): Promise<any> {
    return await lastValueFrom(
      this.http.post<any>(
        `${environment.api.serverUrl}/tron/${network}/create/trc20`,
        {
          to,
          from,
          amount,
          contract,
        }
      )
    );
  }

  public async getAddress(network: TronNetwork, address: string): Promise<any> {
    return await lastValueFrom(
      this.http.get<any>(
        `${environment.api.serverUrl}/tron/${network}/${address}`
      )
    );
  }

  public async sendTransaction(
    network: TronNetwork,
    hex: string
  ): Promise<any> {
    return await lastValueFrom(
      this.http.post<any>(`${environment.api.serverUrl}/tron/${network}/send`, {
        hex,
      })
    );
  }
}

export interface FeePricing {
  low: number;
  medium: number;
  high: number;
}

export const BTC_DECIMAL = 100000000;
export const TRX_DECIMAL = 1000000;
export const ETH_DECIMAL = 1000000000000000000;
export const ETH_GWEI_DECIMAL = 1000000000;