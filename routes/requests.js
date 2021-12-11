module.exports = ({ app, dbConnect, constant }) => {
  app.post("/request/create", (req, res) => {
    const {
      matchRequestFrom,
      matchRequestSender,
      matchRequestTo,
      matchRequestReceiver,
    } = req.body;
    if (
      matchRequestFrom &&
      matchRequestSender &&
      matchRequestTo &&
      matchRequestReceiver
    ) {
      // check the request existed in the database or not.
      const sql =
        "SELECT * FROM match_request WHERE match_request_from = ? AND match_request_to = ?";
      dbConnect.query(
        sql,
        [matchRequestFrom, matchRequestTo],
        (error, result) => {
          if (error) {
            res.status(200).jsonp({
              success: false,
              message: "The system error. Please try again.",
            });
          } else if (result && result.length != 0) {
            res.status(200).jsonp({
              success: false,
              message: "The match request existed in the system.",
            });
          } else {
            const findMatchRequestSql =
              "SELECT * FROM match_request WHERE match_request_from = ? AND match_request_to = ?";
            dbConnect.query(
              findMatchRequestSql,
              [matchRequestTo, matchRequestFrom],
              (error, matchRequest) => {
                if (error) {
                  res.status(200).jsonp({
                    success: false,
                    message: "The system error. Please try again.",
                  });
                } else if (matchRequest && matchRequest.length != 0) {
                  // update the match request
                  const updateMatchRequestSql =
                    "UPDATE match_request SET match_request_status = ?, accepted_date = ? WHERE id = ?";
                  dbConnect.query(
                    updateMatchRequestSql,
                    [
                      constant.matchRequestStatus.accepted,
                      new Date(),
                      matchRequest[0].id,
                    ],
                    (error, updatedResult) => {
                      if (error) {
                        res.status(200).jsonp({
                          success: false,
                          message: "The system error. Please try again.",
                        });
                      } else if (updatedResult) {
                        res.status(200).jsonp({
                          match_request_status:
                            constant.matchRequestStatus.accepted,
                        });
                      }
                    }
                  );
                } else {
                  // insert the new request.
                  const status = constant.matchRequestStatus.pending;
                  const request = [
                    [
                      matchRequestFrom,
                      matchRequestTo,
                      matchRequestSender,
                      matchRequestReceiver,
                      status,
                    ],
                  ];
                  console.log(status, request);
                  const insertSql =
                    "INSERT INTO match_request (match_request_from, match_request_to, match_request_sender, match_request_receiver, match_request_status) VALUES ?";
                  dbConnect.query(insertSql, [request], (error, result) => {
                    if (error) {
                      res.status(200).jsonp({
                        success: false,
                        message: "The system error. Please try again.",
                      });
                    } else {
                      res.status(200).jsonp({
                        message:
                          "The match request has been created successfully",
                      });
                    }
                  });
                }
              }
            );
          }
        }
      );
    } else {
      res.status(200).jsonp({
        success: false,
        message:
          "Please provide the match request from and the match request to.",
      });
    }
  });
};
