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
