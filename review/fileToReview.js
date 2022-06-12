const config = {
  domain: "bank.local.fr",
  defaultHeaders: {
    "Content-type": "application/json",
    "Accept": "application/json",
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
async function fetchTransactions(fromDate, authorization, jws = null, id, page, previousTransactions) {
  console.log(`--- Fetch Trasactions page n°${page} ---`);

  const headers = jws ? {
    ...config.defaultHeaders,
    "jws": jws,
    "Authorisation": authorization
  } : {...config.defaultHeaders, "Authorisation": authorization};

  const {code, response} = await doRequest('GET', `${config.domain}/accounts/${id}/transactions?page=${page}`, headers);

  if (code < 200 || code >= 400 || !response?.data) {
    console.error(`Bad request received from bankin API : ${code}`, response);
    return [];
  }

  if (response?.data?.meta && response?.data?.meta?.hasPageSuivante) {
    const mouvements = response.data.Mouvements;
    const date = mouvements[mouvements.length - 1].dateValeur;

    if (date <= fromDate) {
      console.log("FromDate is Reached - we don't need more transaction");
    } else {

      if (!mouvements)
        throw new Error("Empty list of transactions ! " + JSON.stringify(previousTransactions));

      if (assertTransactions(mouvements)) {
        return [];
      } else {
        console.log(`Push transactions from page ${page}`);
      }

      const nextPagesTransactions = fetchTransactions(fromDate, authorization, (jws || null), id, page + 1, mouvements);
      response.data.Mouvements = mouvements.concat(nextPagesTransactions);
    }
  }

  return response.data.Mouvements;
}
