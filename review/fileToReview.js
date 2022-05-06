const domain = 'bank.local.fr';

/**
 * Simplified function to set headers. Sets them only once, instead of recursively
 * @returns headers object
 */
function setHeaders(authorization, jws) {
  let headers = {
    Authorization: authorization,
    'Content-type': 'application/json',
    Accept: 'application/json',
  };

  if (jws) {
    headers = { ...headers, jws: jws };
  }
  return headers;
}

/**
 * Separates concerns from the doRequestsRecursively function
 * @returns boolean
 */

function isDateOver(fromDate, movements) {
  return movements.at(-1).dateValeur <= fromDate;
}

/**
 * Recursively fetch transactions and concatenate them inside the response
 * object.
 * Separated this logic from the main function.
 * Simplified: less nested ifs, headers and baseUrl set only once,
 * use of const and let instead of var.
 */
async function doRequestsRecursively(
  fromDate,
  headers,
  baseUrl,
  page,
  previousTransactions
) {
  console.log(`--- Fetch Transactions page n°${page} ---`);
  const { code, response } = await doRequest(
    'GET',
    baseUrl + `page=${page}`,
    headers
  );
  if (!response || code !== 200 || !response.data) {
    throw new Error();
  }

  if (response.data.meta && response.data.meta.hasPageSuivante) {
    const movements = response.data.Mouvements;
    if (isDateOver(fromDate, movements)) {
      console.log("FromDate is Reached - we don't need more transaction");
    } else if (!movements) {
      throw new Error(
        'Empty list of transactions ! ' + JSON.stringify(previousTransactions)
      );
    } else {
      // if we have movements
      if (assertTransactions(movements)) {
        return [];
      }
      console.log(`Push transactions from page ${page}`);
      const nextPagesTransactions = await doRequestsRecursively(
        fromDate,
        headers,
        baseUrl,
        page + 1,
        movements
      );
      response.data.Mouvements = movements.concat(nextPagesTransactions);
    }
  }
  return response.data.Mouvements;
}

/**
 * @description Fetch transactions recursively
 * @param {string} fromDate The maximum date of transactions to return
 * @param {string} authorization Authorization header to authent the user
 * @param {jws} jws Jws token, mandatory if we get one from login request
 * @param {Number} id Account id
 * @param {Number} page Number of the page
 * @param {Object} previousTransactions Previous page of transactions (To ckeck for dupes)
 * @return {Object} All transactions available on the page
 */
async function fetchTransactions(
  fromDate,
  authorization,
  jws = null,
  id,
  page
) {
  try {
    const headers = setHeaders(authorization, jws);
    const baseUrl = domain + '/accounts/' + id + '/transactions?';
    return await doRequestsRecursively(fromDate, headers, baseUrl, page);
  } catch (err) {
    throw new CustomError({
      function: 'fetchTransactions',
      statusCode: 'CRASH',
      rawError: e,
    });
  }
}
