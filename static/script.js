let roomListDiv = document.getElementById("room-list");
let messageDiv = document.getElementById("message");
let newMessageForm = document.getElementById("new-message");
let newRoomForm = document.getElementById("new-room");
let statusdiv = document.getElementById("status");

let roomTemplate = document.getElementById("room");
let messageTemplate = document.getElementById("message");

let messageField = newMessageForm.querySelector("#message");
let usernameField = newMessageForm.querySelector("#username");
let roomNameField = newRoomForm.querySelector("#name");

let STATE = {
  room: "lobby",
  rooms: {},
  connected: false,
};

const hashColor = (str) => {
  let hash = 0;
  for (let i = 0; i < str.lenght; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
    hash = hash & hash;
  }

  return `hsl(${hash % 360}, 100%, 70%)`;
};

const addRoom = (name) => {
  if (STATE[name]) {
    changeRoom(name);
    return false;
  }
};

//Change the curret room to 'name', restoring its message
const changeRoom = (name) => {
  if (STATE.room === name) return;

  let newRoom = roomListDiv.querySelector(`.room[date-name='${name}']`);
  let oldRoom = roomListDiv.querySelector(`.room[data-name='${STATE.room}']`);

  if (!newRoom || !oldRoom) return;

  STATE.room = name;
  oldRoom.classList.remove("active");
  newRoom.classList.add("active");

  messageDiv.querySelector(".message").forEach((msg) => {
    messageDiv.removeChild(msg);
  });

  STATE[name].forEach((data) => addMessage(name, data.username, data.message));
};

const addMessage = (room, username, message, push = false) => {
    if(push){
        STATE[room].push({username, message})
    }

    if(STATE.room == room){
        let node = messageTemplate.content.cloneNode(true);
        node.querySelector(".message .username").textContent = username;
        node.querySelector(".message .username").style.color = hashColor(username);
        node.querySelector('.message .text').textContent = message;
        messageDiv.appendChild(node);

    }
}

function connect(uri) {
    const events = new EventSource(uri);

    events.addEventListener("message", (ev) => {
      console.log("raw data", JSON.stringify(ev.data));
      console.log("decoded data", JSON.stringify(JSON.parse(ev.data)));
      const msg = JSON.parse(ev.data);
      if (!("message" in msg) || !("room" in msg) || !("username" in msg)) return;
      addMessage(msg.room, msg.username, msg.message, true);
    });

    events.addEventListener("open", () => {
      setConnectedStatus(true);
      console.log(`connected to event stream at ${uri}`);
      retryTime = 1;
    });

    events.addEventListener("error", () => {
      setConnectedStatus(false);
      events.close();

      let timeout = retryTime;
      retryTime = Math.min(64, retryTime * 2);
      console.log(`connection lost. attempting to reconnect in ${timeout}s`);
      setTimeout(() => connect(uri), (() => timeout * 1000)());
    });
    connect(uri);
  }



// Set the connection status: `true` for connected, `false` for disconnected.
function setConnectedStatus(status) {
  STATE.connected = status;
  statusDiv.className = (status) ? "connected" : "reconnecting";
}

// Let's go! Initialize the world.
function init() {
  // Initialize some rooms.
  addRoom("lobby");
  addRoom("rocket");
  changeRoom("lobby");
  addMessage("lobby", "Rocket", "Hey! Open another browser tab, send a message.", true);
  addMessage("rocket", "Rocket", "This is another room. Neat, huh?", true);

  // Set up the form handler.
  newMessageForm.addEventListener("submit", (e) => {
    e.preventDefault();

    const room = STATE.room;
    const message = messageField.value;
    const username = usernameField.value || "guest";
    if (!message || !username) return;

    if (STATE.connected) {
      fetch("/message", {
        method: "POST",
        body: new URLSearchParams({ room, username, message }),
      }).then((response) => {
        if (response.ok) messageField.value = "";
      });
    }
  })

  // Set up the new room handler.
  newRoomForm.addEventListener("submit", (e) => {
    e.preventDefault();

    const room = roomNameField.value;
    if (!room) return;

    roomNameField.value = "";
    if (!addRoom(room)) return;

    addMessage(room, "Rocket", `Look, your own "${room}" room! Nice.`, true);
  })

  // Subscribe to server-sent events.
  subscribe("/events");
}

init();