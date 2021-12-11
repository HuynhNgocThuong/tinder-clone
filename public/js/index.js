window.addEventListener("DOMContentLoaded", function () {
  // Hide loading indicator
  hideLoading();

  const authenticatedUser = JSON.parse(localStorage.getItem("auth"));
  if (authenticatedUser) {
    // get logout button
    const logoutButton = document.getElementById("header__logout");

    // show authenticated user on the header
    const headerRight = document.getElementById("header__right");
    const userImage = document.getElementById("user__image");
    const userName = document.getElementById("user__name");

    // main card item.
    const mainCardEmptyMessage = document.getElementById("main__card-empty");
    const mainCardItemContainer = document.getElementById(
      "main__card-item-container"
    );
    // main card actions.
    const mainCardActions = document.getElementById("main__card-actions");
    const dislikeBtn = document.getElementById("dislike");
    const likeBtn = document.getElementById("like");

    // main left messages
    const mainLeftMessagesContainer = document.getElementById(
      "main__left-messages"
    );
    const mainLeftEmpty = document.getElementById("main__left-empty");

    let notificationListenerID = authenticatedUser.uid;

    // Chatbox
    const chatBox = document.getElementById("chatbox");
    const chatBoxUserAvatar = document.getElementById("chatbox__user-avatar");
    const chatBoxUserName = document.getElementById("chatbox__user-name");
    const chatBoxClose = document.getElementById("chatbox__close");
    const messageBottom = document.getElementById("message-bottom");
    const messageContainer = document.getElementById("message__container");

    // Call
    const callingDialog = document.getElementById("calling");
    const acceptCallBtn = document.getElementById("accept-call");
    const rejectCallBtn = document.getElementById("reject-call");

    const audioCallBtn = document.getElementById("audio-call");
    const videoCallBtn = document.getElementById("video-call");
    const callScreen = document.getElementById("callScreen");

    let listenerID = null;
    let upcomingCall = null;
    let selectedContact = null;

    const addFriend = (
      matchRequestFrom,
      matchRequestTo,
      matchRequestReceiver
    ) => {
      if (matchRequestFrom && matchRequestTo) {
        const url = `https://${config.CometChatAppId}.api-${config.CometChatRegion}.cometchat.io/v3.0/users/${matchRequestTo}/friends`;
        axios
          .post(
            url,
            { accepted: [matchRequestFrom] },
            {
              headers: {
                Accept: "application/json",
                "Content-Type": "application/json",
                appId: `${config.CometChatAppId}`,
                apiKey: `${config.CometChatAPIKey}`,
              },
            }
          )
          .then((res) => {
            const notificationMessage = {
              message: `Congratulation! ${authenticatedUser.name} and ${matchRequestReceiver} have been matched`,
              type: "match",
              receiverId: matchRequestTo,
            };
            toastr.info(notificationMessage.message);
            loadFriends();
            sendNotification(notificationMessage);
          })
          .catch((error) => {});
      }
    };
    const sendNotification = ({ message, type, receiverId }) => {
      const receiverID = receiverId;
      const customType = type;
      const customData = {
        message,
      };
      let receiverType = CometChat.RECEIVER_TYPE.USER;

      let customMessage = new CometChat.CustomMessage(
        receiverID,
        receiverType,
        customType,
        customData
      );
      CometChat.sendCustomMessage(customMessage).then(
        (message) => {
          console.log("Custom message sent successfully", message);
        },
        (error) => {
          console.log("Custom message sending failed with error", error);
        }
      );
    };
    const listenForNotifications = () => {
      CometChat.addMessageListener(
        notificationListenerID,
        new CometChat.MessageListener({
          onTextMessageReceived: (message) => {
            if (message && (!message.category || message.category !== "call")) {
              const senderUid = message.sender.uid;
              if (selectedContact && selectedContact.uid === senderUid) {
                renderSingleMessage(message);
              } else {
                toastr.info(`There is new message from ${message.sender.name}`);
              }
            }
            console.log("Text message received successfully", textMessage);
          },
          onMediaMessageReceived: (mediaMessage) => {
            console.log("Media message received successfully", mediaMessage);
          },
          onCustomMessageReceived: (customMessage) => {
            console.log("Custom message received successfully", customMessage);
            // Handle custom message
            if (
              !selectedContact ||
              (customMessage &&
                customMessage.sender &&
                customMessage.sender.uid &&
                customMessage.sender.uid !== selectedContact.uid &&
                customMessage.data &&
                customMessage.data.customData &&
                customMessage.data.customData.message)
            ) {
              // Display an info toast with no title
              toastr.info(customMessage.data.customData.message);
              if (
                customMessage &&
                customMessage.type &&
                customMessage.type === "match"
              ) {
                loadFriends();
              }
            }
          },
        })
      );
    };
    // Send message to selected contact and render message
    const sendMessage = (inputMessage) => {
      if (inputMessage) {
        const message = new CometChat.TextMessage(
          selectedContact.uid,
          inputMessage,
          CometChat.RECEIVER_TYPE.USER
        );
        CometChat.sendMessage(message).then(
          (msg) => {
            const sendMessage = {
              text: inputMessage,
              sender: {
                avatar: authenticatedUser.avatar,
              },
              isRigth: true,
            };
            // After send message we will re-render message latest
            renderSingleMessage(sendMessage);
            // scroll to bottm
            scrollToBottom();
          },
          (error) => {
            alert("Cannot send your message, please try again.");
          }
        );
      }
    };
    const isRight = (message) => {
      if (message.isRight !== null && message.isRight !== undefined) {
        // My message render in the right side of chatbox
        return message.isRight;
      }
      return message.sender.uid === authenticatedUser.uid;
    };
    const renderSingleMessage = (message) => {
      if (message && isRight(message)) {
        messageContainer.innerHTML += `
        <div class="message__right">
          <div class="message__content message__content--right">
            <p>${message.text}</p>
          </div>
          <div class="message__avatar">
            <img src="${message.sender.avatar}">
          </div>
        </div>
        `;
      } else {
        messageContainer.innerHTML += `
          <div class="message__left">
            <div class="message__avatar">
              <img src="${message.sender.avatar}"/>
            </div>
            <div class="message__content message__content--left">
              <p>${message.text}</p>
            </div>
          </div>
        `;
      }
    };
    /**
     * @param {*} messages
     * Render list message
     */
    const renderMessages = (messages) => {
      if (messages && messages.length !== 0) {
        messages.forEach((message) => {
          if (message) {
            renderSingleMessage(message);
          }
        });
      }
      scrollToBottom();
    };
    /**
     * Get list message of authenticated user from cometchat
     *
     */
    const loadMessages = () => {
      const limit = 50;
      const messageRequestBuilder = new CometChat.MessagesRequestBuilder()
        .setCategories(["message"])
        .setTypes(["text"])
        .setLimit(limit);
      messageRequestBuilder.setUID(selectedContact.uid);
      const messageRequest = messageRequestBuilder.build();
      messageRequest
        .fetchPrevious()
        .then((messages) => {
          if (messages && messages.length !== 0) {
            console.log("Messages for thread fetched successfully", messages);
            renderMessages(messages);
          }
        })
        .catch((error) => {
          console.log("Message fetching failed with error:", error);
        });
    };

    isCurrentUser = (selectedContact, selectedUid) => {
      return (
        selectedContact &&
        selectedUid &&
        selectedContact.uid &&
        selectedContact.uid === selectedUid
      );
    };

    /**
     * Open chatbox with selectedUid - from friend
     */
    window.openChatBox = (selectedUid, name, avatar) => {
      if (
        selectedUid &&
        name &&
        avatar &&
        !isCurrentUser(selectedContact, selectedUid)
      ) {
        selectedContact = { uid: selectedUid };
        chatBox.classList.remove("hide");
        chatBoxUserName.innerHTML = name;
        chatBoxUserAvatar.src = avatar;
        messageContainer.innerHTML = "";
        loadMessages();
        listenForCall();
      }
    };
    if (chatBoxClose) {
      chatBoxClose.addEventListener("click", function () {
        messageContainer.innerHTML = "";
        chatBox.classList.add("hide");
        CometChat.removeMessageListener(selectedContact.uid);
        selectedContact = null;
        upcomingCall = null;
        listenerID = null;
      });
    }
    $("#message-input").keyup(function (e) {
      if (e.keyCode == 13) {
        const inputMessage = e.target.value;
        if (inputMessage) {
          sendMessage(inputMessage);
          $(this).val("");
        }
      }
    });
    const createMatchRequest = (matchRequestTo, matchRequestReceiver) => {
      if (
        authenticatedUser &&
        authenticatedUser.uid &&
        authenticatedUser.name &&
        matchRequestTo &&
        matchRequestReceiver
      ) {
        console.log({
          authenticatedUser,
          matchRequestTo,
          matchRequestReceiver,
        });
        axios
          .post("/request/create", {
            matchRequestFrom: authenticatedUser.uid,
            matchRequestSender: authenticatedUser.name,
            matchRequestTo,
            matchRequestReceiver,
          })
          .then((res) => {
            console.log(res.data.match_request_status);
            if (
              res &&
              res.data &&
              res.data.match_request_status &&
              res.data.match_request_status === 1
            ) {
              addFriend(
                authenticatedUser.uid,
                matchRequestTo,
                matchRequestReceiver
              );
            }
          })
          .catch((error) => console.log(error));
      }
    };
    const swipeLeft = (element) => {
      $(element).addClass("rotate-right").delay(700).fadeOut(1);
      $(".main__card-item").find(".status").remove();
      $(element).append('<div class="status dislike">Dislike!</div>');
      $(element).next().removeClass("rotate-left rotate-right").fadeIn(400);
      setTimeout(() => {
        shouldHideMainCard();
      }, 1100);
    };

    const swipeRight = (element) => {
      $(element).addClass("rotate-left").delay(700).fadeOut(1);
      $(".main__card-item").find(".status").remove();
      $(element).append('<div class="status like">Like!</div>');
      $(element).next().removeClass("rotate-left rotate-right").fadeIn(400);
      const matchRequestTo = $(element).attr("data-id");
      const matchRequestReceiver = $(element).attr("data-name");
      createMatchRequest(matchRequestTo, matchRequestReceiver);
      setTimeout(() => {
        shouldHideMainCard();
      }, 1100);
    };

    const applySwing = () => {
      $(".main__card-item").on("swiperight", function () {
        swipeRight(this);
      });
      $(".main__card-item").on("swipeleft", function () {
        swipeLeft(this);
      });
    };

    const showHeaderInformation = () => {
      if (
        headerRight &&
        userImage &&
        userName &&
        authenticatedUser &&
        authenticatedUser.uid
      ) {
        headerRight.classList.remove("header__right--hide");
        userImage.src = authenticatedUser.avatar;
        userName.innerHTML = `Hello, ${authenticatedUser.name}`;
      }
    };

    const renderCardList = (recommendedUsers) => {
      if (recommendedUsers && recommendedUsers.length !== 0) {
        const cardList = document.getElementById("main__card-item-container");
        recommendedUsers.forEach((user, index) => {
          if (index == 0) {
            cardList.innerHTML += `<div class="main__card-item" style="display: block;" data-id="${user.user_cometchat_uid}" data-name="${user.user_full_name}">
              <div class="avatar" style="display: block; background-image: url(${user.user_avatar})"></div>
              <span>${user.user_full_name}, ${user.user_age}</span>
            </div>`;
          } else {
            cardList.innerHTML += `<div class="main__card-item" data-id="${user.user_cometchat_uid}" data-name="${user.user_full_name}">
              <div class="avatar" style="display: block; background-image: url(${user.user_avatar})"></div>
              <span>${user.user_full_name}, ${user.user_age}</span>
            </div>`;
          }
        });
      }
    };

    const getCurrentCard = function () {
      const cards = document.getElementsByClassName("main__card-item");
      if (cards && cards.length !== 0) {
        for (const card of cards) {
          if (card.getAttribute("style")) {
            if (card.getAttribute("style").indexOf("display: block") != -1) {
              return card;
            }
          }
        }
        return null;
      }
      return null;
    };

    const showMainCard = () => {
      mainCardActions.classList.remove("hide");
      mainCardItemContainer.classList.remove("hide");
      mainCardEmptyMessage.classList.add("hide");
    };

    const hideMainCard = () => {
      mainCardActions.classList.add("hide");
      mainCardItemContainer.classList.add("hide");
      mainCardEmptyMessage.classList.remove("hide");
    };
    const shouldHideMainCard = () => {
      const nextCard = getCurrentCard();
      if (!nextCard) {
        hideMainCard();
      }
    };
    const loadRecommendedUsers = () => {
      axios
        .post("/users/recommend", {
          gender: authenticatedUser.gender === "Male" ? "Female" : "Male",
          ccUid: authenticatedUser.uid,
        })
        .then((res) => {
          console.log(res);
          if (res && res.data && res.data.length !== 0) {
            showMainCard();
            renderCardList(res.data);
          }
        })
        .catch((error) => {});
    };
    if (likeBtn) {
      likeBtn.addEventListener("click", function () {
        const currentCard = getCurrentCard();
        if (currentCard) {
          swipeRight(currentCard);
        } else {
          hideMainCard();
        }
      });
    }
    if (dislikeBtn) {
      dislikeBtn.addEventListener("click", function () {
        const currentCard = getCurrentCard();
        if (currentCard) {
          swipeLeft(currentCard);
        } else {
          hideMainCard();
        }
      });
    }
    const renderFriends = (userList) => {
      if (userList && userList.length !== 0) {
        userList.forEach((user) => {
          if (user) {
            mainLeftMessagesContainer.innerHTML += `<div class="main__left-message" onclick="openChatBox('${user.uid}', '${user.name}', '${user.avatar}')">
              <img
                src="${user.avatar}"
                alt="${user.name}"
              />
              <span>${user.name}</span>
            </div>`;
          }
        });
      }
    };
    const loadFriends = () => {
      const appSetting = new CometChat.AppSettingsBuilder()
        .subscribePresenceForAllUsers()
        .setRegion(config.CometChatRegion)
        .build();
      CometChat.init(config.CometChatAppId, appSetting).then(
        () => {
          // You can now call login function.
          const limit = 30;
          const usersRequest = new CometChat.UsersRequestBuilder()
            .setLimit(limit)
            .friendsOnly(true)
            .build();
          usersRequest.fetchNext().then(
            (userList) => {
              if (userList && userList.length !== 0) {
                mainLeftEmpty.classList.add("hide");
                mainLeftMessagesContainer.innerHTML = "";
                renderFriends(userList);
              } else {
                mainLeftEmpty.classList.remove("hide");
                mainLeftEmpty.innerHTML = "You do not have any contact";
              }
            },
            (error) => {}
          );
        },
        (error) => {
          // Check the reason for error and take appropriate action.
        }
      );
    };
    const scrollToBottom = () => {
      if (messageBottom) {
        messageBottom.parentNode.scrollTop = messageBottom.offsetTop;
      }
    };

    const rejectCall = (status, sessionId) => {
      CometChat.rejectCall(sessionId, status).then(
        (call) => {
          console.log("Call rejected successfully", call);
          hideCallingDialog();
          upcomingCall = null;
        },
        (error) => {
          console.log("Call rejection failed with error:", error);
        }
      );
    };
    const showCallingDialog = () => {
      callingDialog.classList.remove("calling--hide");
    };
    const hideCallingDialog = () => {
      callingDialog.classList.add("calling--hide");
    };
    const listenForCall = () => {
      listnerID = uuid.v4();
      CometChat.addCallListener(
        listnerID,
        new CometChat.CallListener({
          onIncomingCallReceived: (call) => {
            console.log("ListenID Call:", listnerID);
            console.log("Incoming call:", call);
            upcomingCall = call;
            // Handle incoming call
            showCallingDialog();
          },
          onOutgoingCallAccepted: (call) => {
            console.log("Outgoing call accepted:", call);
            // Outgoing Call Accepted
            hideCallingDialog();
          },
          onOutgoingCallRejected: (call) => {
            console.log("Outgoing call rejected:", call);
            // Outgoing Call Accepted
            hideCallingDialog();
          },
          onIncomingCallCancelled: (call) => {
            console.log("Incoming call calcelled:", call);
            // Outgoing Call Accepted
            hideCallingDialog();
          },
        })
      );
    };
    const startCall = (call) => {
      callScreen.classList.remove("bottom-stack");
      callScreen.classList.add("on-stack");
      const sessionId = call.sessionId;
      const callType = call.type;
      const callSettings = new CometChat.CallSettingsBuilder()
        .setSessionID(sessionId)
        .enableDefaultLayout(true)
        .setIsAudioOnlyCall(callType == "audio" ? true : false)
        .build();
      CometChat.startCall(
        callSettings,
        document.getElementById("callScreen"),
        new CometChat.OngoingCallListener({
          onUserJoined: (user) => {
            /* Notification received here if another user joins the call. */
            console.log("User joined call:", user);
            /* this method can be use to display message or perform any actions if someone joining the call */
          },
          onUserLeft: (user) => {
            /* Notification received here if another user left the call. */
            console.log("User left call:", user);
            /* this method can be use to display message or perform any actions if someone leaving the call */
          },
          onUserListUpdated: (userList) => {
            console.log("User list:", userList);
          },
          onCallEnded: (call) => {
            /* Notification received here if current ongoing call is ended. */
            console.log("Call ended:", call);
            /* hiding/closing the call screen can be done here. */
            callScreen.classList.add("bottom-stack");
            callScreen.classList.remove("on-stack");
            const status = CometChat.CALL_STATUS.CANCELLED;
            rejectCall(status, call.sessionId);
          },
          onError: (error) => {
            console.log("Error :", error);
            /* hiding/closing the call screen can be done here. */
          },
          onMediaDeviceListUpdated: (deviceList) => {
            console.log("Device List:", deviceList);
          },
        })
      );
    };
    const initCall = (inputTypeCall) => {
      if (selectedContact && selectedContact.uid) {
        const callType = inputTypeCall;
        const receiverType = CometChat.RECEIVER_TYPE.USER;
        const call = new CometChat.Call(
          selectedContact.uid,
          callType,
          receiverType
        );
        CometChat.initiateCall(call).then(
          (outGoingCall) => {
            console.log("Call initated successfullt: ", outGoingCall);
            startCall(call);
          },
          (error) => {
            console.log("Call initialization failed with exception:", error);
          }
        );
      }
    };
    if (audioCallBtn) {
      audioCallBtn.addEventListener("click", function () {
        initCall(CometChat.CALL_TYPE.AUDIO);
      });
    }
    if (videoCallBtn) {
      videoCallBtn.addEventListener("click", function () {
        initCall(CometChat.CALL_TYPE.VIDEO);
      });
    }
    if (acceptCallBtn) {
      acceptCallBtn.addEventListener("click", function () {
        CometChat.acceptCall(upcomingCall.sessionId).then(
          (call) => {
            console.log("Call accepted successfully:", call);
            // start the call using the startCall() method
            hideCallingDialog();
            startCall(upcomingCall);
          },
          (error) => {
            console.log("Call acceptance failed with error", error);
          }
        );
      });
    }
    if (rejectCallBtn) {
      rejectCallBtn.addEventListener("click", function () {
        const status = CometChat.CALL_STATUS.REJECTED;
        rejectCall(status, upcomingCall.sessionId);
      });
    }
    if (logoutButton) {
      logoutButton.addEventListener("click", function () {
        const isLeaved = confirm("Do you want to log out ?");
        if (isLeaved) {
          CometChat.logout().then((response) => {
            localStorage.removeItem("auth");
            window.location.href = "/login.html";
          });
        }
      });
    }
    showHeaderInformation();
    loadRecommendedUsers();
    loadFriends();
    listenForNotifications();
  } else {
    // redirect user to the login page.
    window.location.href = "/login.html";
  }
});
