
/**
 * Simple network address validations (To be improved)
 *
 * @export
 * @class CryptoAddressValidator
 */
export class CryptoAddressValidator {
  public static test(address: string, network: string, testnet = false) {
    switch (network) {
      case 'btc':
      case 'tbtc':
        return CryptoAddressValidator.btc(address, testnet);
      case 'tbnb':
      case 'bnb':
      case 'ropsten':
      case 'eth':
        return CryptoAddressValidator.eth(address);
      case 'niles':
      case 'trx':
        return CryptoAddressValidator.tron(address);
    }
  }


  /**
   *
   * Source : https://stackoverflow.com/questions/21683680/regex-to-match-bitcoin-addresses
   * @private
   * @static
   * @param {string} address
   * @param {boolean} testnet
   * @returns {boolean}
   * @memberof CryptoAddressValidator
   */
  private static btc(address: string, testnet: boolean): boolean {
    if (testnet) {
      return /^(?:[13]{1}[a-km-zA-HJ-NP-Z1-9]{26,33}|bc1[a-z0-9]{39,59})$/.test(
        address
      );
    } else {
      return /^(?:[13]{1}[a-km-zA-HJ-NP-Z1-9]{26,33}|tb1[a-z0-9]{39,59})$/.test(
        address
      );
    }
  }

  /**
   *
   * Source : https://www.regextester.com/99711
   * @private
   * @static
   * @param {string} address
   * @returns {boolean}
   * @memberof CryptoAddressValidator
   */
  private static eth(address: string): boolean {
    return /^0x[a-fA-F0-9]{40}$/g.test(address);
  }

  /**
   *
   * TODO : Base58 check on the string after T
   * @private
   * @static
   * @param {string} address
   * @returns {boolean}
   * @memberof CryptoAddressValidator
   */
  private static tron(address: string): boolean {
    return address.substring(0, 1) === 'T' && address.length === 34;
  }
}
