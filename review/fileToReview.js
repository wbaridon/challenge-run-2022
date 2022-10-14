const domain = "bank.local.fr";

function setHeaders(authorization, jws) {
  let headers = {
    Authorisation: authorization,
    "Content-type": "application/json",
    Accept: "application/json",
  };
  if (jws) {
    headers = {
      ...headers,
      jws: jws,
    };
  }
  return headers;
}

async function fetchTransactionsRecursively(
  headers,
  fromDate,
  authorization,
  jws = null,
  id,
  page,
  previousTransactions
) {
  console.log(`--- Fetch Transactions page n°${page} ---`);
  try {
    const { code, response } = await doRequest(
      "GET",
      domain + "/accounts/" + id + "/transactions?" + `page=${page}`,
      headers
    );

    if (response && code == 200 && response.data) {
      if (response.data.meta) {
        if (response.data.meta.hasPageSuivante) {
          let mouvements = response.data.Mouvements;
          if (mouvements.length === 0) {
            throw new Error(
              "Empty list of transactions ! " +
                JSON.stringify(previousTransactions)
            );
          } else {
            const date = mouvements[mouvements.length - 1].dateValeur;
            if (date <= fromDate) {
              console.log("FromDate is Reached - we don't need more transaction")
            } else {
              // if we have mouvements
              if (mouvements.length > 0) {
                console.log(`Push transactions from page ${page}`);
                let nextPagesTransactions = fetchTransactions(
                  headers,
                  fromDate,
                  authorization,
                  jws || null,
                  id,
                  page + 1,
                  mouvements
                );
                response.data.Mouvements = mouvements.concat(
                  nextPagesTransactions
                );
              } 
            }
          }
        }  
      return response.data.Mouvements;
    } else {
      throw new Error();
    }
  } catch (err) {
    throw new CustomError({
      function: "fetchTransactions",
      statusCode: "CRASH",
      rawError: e,
    });
  }
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
  page,
  previousTransactions
) {
  const headers = setHeaders(authorization, jws);
  return await fetchTransactionsRecursively(
    headers,
    fromDate,
    authorization,
    jws,
    id,
    page,
    previousTransactions
  );
}
