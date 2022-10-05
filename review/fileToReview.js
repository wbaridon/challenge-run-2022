const domain = "bank.local.fr"

/**
 * @description This function will generate the headers for each http request.
 * @param {string} authorization The authorization token.
 * @param {string} jws The jws token.
 * @returns {Object} The headers.
 */
function genrateHeaders(authorization, jws = null) {
    if (jws) {
        return {
            "Authorisation": authorization,
            "jws": jws,
            "Content-type": "application/json",
            "Accept": "application/json"
        }
    } else {
        return {
            "Authorisation": authorization,
            "Content-type": "application/json",
            "Accept": "application/json",
        }
    }
}

/**
 * @description Fetch transactions recursively
 * @param {string} headers Authorization header to authent the user if needed
 * @param {string} fromDate The maximum date of transactions to return
 * @param {string} authorization Authorization header to authent the user
 * @param {jws} jws Jws token, mandatory if we get one from login request
 * @param {Number} id Account id
 * @param {Number} page Number of the page
 * @param {Object} previousTransactions Previous page of transactions (To ckeck for dupes)
 * @return {Object} All transactions available on the page
 */

async function fetchTransactionsRecursively(headers, fromDate, authorization, jws = null, id, page, previousTransactions) {
    console.log(`--- Fetch Trasactions page n°${page} ---`);
    try {
        const { code, response } = await doRequest('GET',
            domain + '/accounts/' + id + '/transactions?' + `page=${page}`,
            headers);

        if (!response || !code == 200 || !response.data) {
            throw new Error("Empty response");
        }
        if (response.data.meta && response.data.meta.hasPageSuivante) {
            const mouvements = response.data.Mouvements;
            const date = mouvements[mouvements.length - 1].dateValeur;
            if (date <= fromDate) {
                console.log("FromDate is Reached - we don't need more transaction");
            } else {
                if (!mouvements) {
                    throw new Error("Empty list of transactions ! " + JSON.stringify(previousTransactions));
                }
                // if we have mouvements
                if (assertTransactions(mouvements)) {
                    return [];
                }
                console.log(`Push transactions from page ${page}`);
                const nextPagesTransactions = fetchTransactions(fromDate, authorization, (jws || null), id, page + 1, mouvements);
                response.data.Mouvements = mouvements.concat(nextPagesTransactions);

            }
        }
        return response.data.Mouvements;

    } catch (err) {
        throw new CustomError({
            function: 'fetchTransactions',
            statusCode: 'CRASH',
            rawError: e,
        });
    }

}

/**
 * @description Fetch transactions
 * @param {string} fromDate The maximum date of transactions to return
 * @param {string} authorization Authorization header to authent the user
 * @param {jws} jws Jws token, mandatory if we get one from login request
 * @param {Number} id Account id
 * @param {Number} page Number of the page
 * @param {Object} previousTransactions Previous page of transactions (To ckeck for dupes)
 * @return {Object} All transactions available on the page
 **/

async function fetchTransactions(fromDate, authorization, jws = null, id, page, previousTransactions) {
    const headers = genrateHeaders(authorization, jws)
    return await fetchTransactionsRecursively(headers, fromDate, authorization, jws, id, page, previousTransactions)
}