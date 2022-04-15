
const domain = "bank.local.fr"

/**
 * @description Fetch transactions recursively
 * @param {String} fromDate The maximum date of transactions to return
 * @param {String} authorization Authorization header to authent the user
 * @param {String} jwt jwt token, mandatory if we get one from login request
 * @param {Number} account_id Account id
 * @param {Number} page Number of the page
 * @param {Object} allTransactions Previous page of transactions (To ckeck for dupes)
 * @return {Promise<Array>} All transactions available on the page
 */
async function fetchTransactions(fromDate, authorization, jwt = null, account_id, page = 0, allTransactions = []) {
  console.log(`--- Fetch transactions in page n°${page} ---`);

  try {

    const headers = {
      "Authorisation": authorization,
      "Content-type": "application/json",
      "Accept": "application/json"
    }

    // In case of JWT token
    if (jwt) {
      headers["Authorisation"] = `Bearer ${jwt}`;
    }

    const { code, response } = await doRequest(
      'GET',
      `${domain}/accounts/${account_id}/transactions?page=${page}`,
      headers
    );

    // Invalid response status
    if (!response || code != 200 || !response.data) {
      throw new Error(`Fetching transactions of page ${page} failed !`);
    }

    // Empty meta response
    if (!response.data.meta)
      return allTransactions;

    const mouvements = response.data.Mouvements;
    const date = mouvements[mouvements.length - 1].dateValeur;

    // Date limit reached
    if (date <= fromDate) {
      console.log("FromDate is Reached - we don't need more transaction");
      return allTransactions;
    }

    // if we have no more movements
    if (!mouvements) {
      return allTransactions;
    }

    // New movements/transactions
    if (assertTransactions(mouvements)) {
      console.log(`Push new transactions from page n°${page}`);

      if (mouvements) {
        for (let i in mouvements) {
          allTransactions.push(mouvements[i]);
        }
      }
    }


    // There is no more next page
    if (!response.data.meta.hasPageSuivante) {
      return allTransactions;
    }

    // Recursive : move to the next page
    return await fetchTransactions(fromDate, authorization, jwt, account_id, page + 1, allTransactions);

  } catch (err) {
    throw new Error(
      JSON.stringify({
        function: 'fetchTransactions',
        statusCode: e.response.status,
        rawError: e,
      })
    );
  }
}
