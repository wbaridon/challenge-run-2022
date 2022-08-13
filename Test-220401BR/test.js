const axios = require("axios");
const querystring = require("querystring");

exports.launchTest = () => {
  const userCredentials = {
    user: "BankinUser",
    password: "12345678",
  };

  axios.default.defaults.headers.common["Content-type"] = "application/json";

  const username = "BankinClientId";
  const password = "sercret";
  //Should use the following encoded string for the basic auth but does not work
  console.log(Buffer.from(`${username}:${password}`).toString("base64"));
  axios
    .post("http://localhost:3000/login", userCredentials, {
      headers: {
        "Content-Type": "application/json",
        Authorization: "Basic QmFua2luQ2xpZW50SWQ6c2VjcmV0",
      },
    })
    .then((response) => response.data)
    .then((token) => {
      //   console.log("Success:", token);
      const body = querystring.stringify({
        grant_type: "refresh_token",
        refresh_token: token.refresh_token,
      });
      axios
        .post("http://localhost:3000/token", body, {
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
        })
        .then((res) => {
          //   console.log(res.data);
          let bearerToken = "Bearer " + res.data.access_token;
          axios.default.defaults.headers.common["Authorization"] = bearerToken;
          axios
            .get("http://localhost:3000/accounts")
            .then((res) => {
              //   console.log(res.data);
              const finalResult = res.data.account.map(async (account) => {
                const partialResult = account;
                await axios
                  .get(
                    `http://localhost:3000/accounts/${account.acc_number}/transactions`
                  )
                  .then((res) => {
                    partialResult.transactions = res.data.transactions;
                  })
                  .catch((error) => {
                    console.error(
                      "Error in transactions:",
                      error.response.config
                    );
                  });
                // console.log(partialResult);
                return partialResult;
              });
              Promise.all(finalResult).then((values) => {
                console.log("Fianl Result:");
                console.log(values);
                values.forEach((value) => {
                  console.log(value);
                });
              });
            })
            .catch((error) => {
              console.error("Error in accounts:", error.response.config);
            });
        })
        .catch((error) => {
          console.error("Error in token:", error.response.config);
        });
    })
    .catch((error) => {
      console.error("Error in login:", error);
    });
};
