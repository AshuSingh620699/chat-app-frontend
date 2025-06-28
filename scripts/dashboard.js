const token = sessionStorage.getItem("token");
if (!token) {
    alert("You are not logged in!!!");
    window.location.href = "../index.html";
}

// Storing set of online users
const onlineUsers = new Set();

// Queuing message..
const messageQueue = []

const defaultImage = "https://img.freepik.com/free-vector/blue-circle-with-white-user_78370-4707.jpg";
// Extract user ID from JWT
const userId = () => JSON.parse(atob(token.split('.')[1])).id;
const loggedInUser = userId()
console.log(loggedInUser)

const chatMessages = document.getElementById('chatMessages');
const chatHeader = document.getElementById('chatHeader');
const friendList = document.getElementById('friendsList');

let currentChatUser = null;

// Pagination things
let skipCount = 0
let limit = 50
let allMessageLoaded = false

// Tracking status
function getStatusSymbol(status) {
    switch (status) {
        case 'sent': return '✅';
        case 'delivered': return '✅✅';
        case 'seen': return '👁️';
        default: return '';
    }
}

function getStatusClass(status) {
    return `status-${status}`;
}

function formatTime(isoString) {
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function updateMessageStatus(messageId, newStatus) {
    const statusElem = document.querySelector(`.message-status[data-id="${messageId}"]`);
    if (statusElem) {
        statusElem.className = `message-status ${getStatusClass(newStatus)}`;
        statusElem.textContent = getStatusSymbol(newStatus);
    }
}


// Tracking Unread messages
const unreadMap = new Map() // key : userId, value: count

function highlightUnreadInFriendList() {
    document.querySelectorAll('.friend-item').forEach(card => {
        const userId = card.dataset.userId;
        const unread = unreadMap.get(userId);
        let badge = card.querySelector('.unread-badge');

        if (unread) {
            if (!badge) {
                badge = document.createElement('span');
                badge.className = 'unread-badge';
                card.appendChild(badge);
            }
            badge.textContent = unread > 99 ? "99+" : unread;
        } else {
            if (badge) badge.remove();
        }
    });
}

// ✅ Load Friends
const createCard = (user) => {
    const card = document.createElement('div');
    card.classList.add('friend-item');
    card.dataset.userId = user._id;

    // Profile image container with status dot
    const profileWrapper = document.createElement("div");
    profileWrapper.classList.add('profile-wrapper');

    const profileImg = document.createElement("img");
    profileImg.src = user.profileImage || defaultImage;
    profileImg.alt = `${user.username}'s profile picture`;
    profileImg.className = "profile-image";

    const statusDot = document.createElement("span");
    statusDot.className = "status-dot offline"; // default offline

    profileWrapper.appendChild(profileImg);
    profileWrapper.appendChild(statusDot);

    const nameSpan = document.createElement("span");
    nameSpan.textContent = user.username;

    card.appendChild(profileWrapper);
    card.appendChild(nameSpan);

    const unreadCount = unreadMap.get(user._id);
    if (unreadCount) {
        const badge = document.createElement("span");
        badge.textContent = unreadCount;
        badge.className = "unread-badge";
        card.appendChild(badge);
    }

    return card;
};


async function loadFriends() {
    try {
        const res = await fetch('https://chat-app-backend-vf79.onrender.com/api/friends/friends', {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        const friends = await res.json();
        friendList.innerHTML = '';

        friends.forEach(friend => {
            const div = createCard(friend)
            div.onclick = () => selectFriend(friend);
            friendList.appendChild(div);

            // 👇 After DOM element created, apply online status
            if (onlineUsers.has(friend._id)) {
                updateFriendStatus(friend._id, true);
            }
        });

    } catch (err) {
        console.error('Failed to load friends', err);
    }
}

async function loadMessages(prepend = false) {
    if (allMessageLoaded || !currentChatUser) return;

    try {
        const res = await fetch(`https://chat-app-backend-vf79.onrender.com/api/messages/history/${currentChatUser._id}?skip=${skipCount}&limit=${limit}`, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        const messages = await res.json();
        if (messages.length < limit) allMessageLoaded = true;

        skipCount += messages.length;

        const oldScrollHeight = chatMessages.scrollHeight;

        // 👇 Only reverse if we're prepending
        const messagesToRender = prepend ? messages.reverse() : messages;

        // console.log('msg.createdAt:', msg.createdAt);

        messagesToRender.forEach(msg => {
            const msgDiv = document.createElement('div');
            msgDiv.className = 'message';
            msgDiv.classList.add(msg.sender === userId() ? 'sent' : 'received');
            const statusClass = msg.sender === userId() ? getStatusClass(msg.status) : '';
            const statusSymbol = msg.sender === userId() ? getStatusSymbol(msg.status) : '';

            msgDiv.innerHTML = `
                <span class="message-content">${msg.content}</span>
                <span class="message-meta">
                    <span class="message-time">${formatTime(msg.timestamp)}</span>
                    ${msg.sender === userId() ? `<span class="message-status ${statusClass}" data-id="${msg._id}">${statusSymbol}</span>` : ''}
                </span>
                `;

            msgDiv.dataset.id = msg._id;

            if (prepend) {
                chatMessages.prepend(msgDiv);
            } else {
                chatMessages.appendChild(msgDiv);
            }
        });

        // Maintain scroll position when prepending
        if (prepend) {
            chatMessages.scrollTop = chatMessages.scrollHeight - oldScrollHeight;
        } else {
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }

    } catch (err) {
        console.error('Error loading messages:', err);
    }
}

const socket = io('https://chat-app-backend-vf79.onrender.com'); // Make sure port matches backend

socket.on('connect', () => {
    console.log("Connected to socket server");

    // Register current user (you already have the user ID after login)
    socket.emit('register', userId());
});


let unreadTitleInterval = null;
let originalTitle = document.title;

// ✅ Listen for new messages
socket.on('receive-message', ({ senderId, content, timestamp, messageId }) => {
    console.log("received", messageId)
    if (messageId) {
        socket.emit('message-delivered', messageId); // 👈 Emit delivery event to server
    } else {
        console.warn("No messageId received:", data);
    }
    if (currentChatUser && senderId === currentChatUser._id) {
        // Current chat is open → show message directly
        const msgDiv = document.createElement('div');
        msgDiv.className = 'message received';
        msgDiv.innerHTML = `
      <span class="message-content">${content}</span>
      <span class="message-meta">
        <span class="message-time">${formatTime(timestamp)}</span>
      </span>
    `;
        msgDiv.dataset.id = messageId;
        chatMessages.appendChild(msgDiv);
        typinIndi()
        chatMessages.scrollTop = chatMessages.scrollHeight;
        // 👇 Emit seen event right after showing the message
        socket.emit('message-seen', {
            userId: loggedInUser,
            fromId: currentChatUser._id
        });
    } else {
        // Not current chat → track as unread
        const count = unreadMap.get(senderId) || 0;
        // Increment unread count for that user
        unreadMap.set(senderId, (unreadMap.get(senderId) || 0) + 1);

        // Refresh friend list to show badge
        highlightUnreadInFriendList();

        console.log(senderId)
        // Showing Notification Card
        showNotification(content, senderId)
    }
});
socket.on('message-delivered', (messageId) => {
    console.log("Socket: message-delivered received for:", messageId);
    updateMessageStatus(messageId, 'delivered');
});

function typinIndi(from){
    const chatBox = document.querySelector(`#chatMessages`);
    const user = chatBox.getAttribute("data-user")

    if (from !== user) return;

    let typingEl = chatBox.querySelector('.typing-indicator');
    
    // Create new typing indicator
    if (!typingEl) {
        typingEl = document.createElement('div');
        typingEl.classList.add('typing-indicator');
        typingEl.textContent = 'typing...';

        chatBox.appendChild(typingEl);
    }
    // Reset timeout
    clearTimeout(typingEl.typingTimeout);
    typingEl.typingTimeout = setTimeout(() => {
        typingEl.remove();
    }, 1000);
}

// Listen for typing...
socket.on('typing-notification', ({ from }) => {
    console.log("Received typing notification from:", from)
    typinIndi(from);
})


// Handling 'message-seen' in frontend
socket.on("messages-seen", ({ by, ids }) => {
    console.log(`Seen update received from ${by}:`, ids);
    ids.forEach(id => {
        updateMessageStatus(id, 'seen');
    });
});

socket.on('user-online', (userId) => {
    console.log(`User ${userId} is now online`);
    onlineUsers.add(userId);
    // Optionally show green dot on friend's avatar
    updateFriendStatus(userId, true);
});

socket.on('increment-unread', ({ from }) => {
    const count = unreadMap.get(from) || 0;
    unreadMap.set(from, count + 1);
    highlightUnreadInFriendList();
});

socket.on('user-offline', (userId) => {
    console.log(`User ${userId} is now offline`);
    onlineUsers.delete(userId);
    updateFriendStatus(userId, false);
});

socket.on('friends-online', (friendIds) => {
    console.log("Friends already online:", friendIds);
    friendIds.forEach(fid => {
        onlineUsers.add(fid);
        updateFriendStatus(fid, true);
    });
});
function updateFriendStatus(userId, isOnline) {
    setTimeout(() => {
        const card = document.querySelector(`.friend-item[data-user-id="${userId}"]`);
        if (card) {
            const dot = card.querySelector('.status-dot');
            if (dot) {
                dot.classList.toggle('online', isOnline);
                dot.classList.toggle('offline', !isOnline);
            }
        }
    }, 3000)
}

function flashTitle(message) {

    if (unreadTitleInterval) return;

    let visible = true;
    unreadTitleInterval = setInterval(() => {
        document.title = visible ? message : originalTitle
        visible = !visible
    }, 1000)
}
// Stop flashing when tab is focused
window.addEventListener('focus', () => {
    clearInterval(unreadTitleInterval);
    unreadTitleInterval = null;
    document.title = originalTitle;
});


const input = document.getElementById('messageInput')
if (input) {
    let typingTimeout;
    input.addEventListener('input', () => {
        socket.emit('typing', {
            to: currentChatUser._id,
            from: loggedInUser
        })
    })
    clearTimeout(typingTimeout)
    typingTimeout = setTimeout(() => {
    }, 1000)
}

document.getElementById('sendBtn').onclick = async () => {
    const input = document.getElementById('messageInput');
    const content = input.value.trim();
    if (!content || !currentChatUser) return;

    // Storing locally incase of low internet/no internet
    const localId = 'local-' + Date.now()
    const timestamp = new Date().toISOString()

    const msgDiv = document.createElement('div');
    msgDiv.className = 'message sent';
    msgDiv.innerHTML = `
    <span class="message-content">${content}</span>
    <span class="message-meta">
        <span class="message-time">${formatTime(new Date().toISOString())}</span>
        <span class="message-status status-sent" data-id="${localId}">⏳</span>
    </span>
`;
    chatMessages.appendChild(msgDiv);
    typinIndi()
    chatMessages.scrollTop = chatMessages.scrollHeight;
    input.value = '';

    // Queue if online
    if (!navigator.onLine) {
        console.warn("Offline, queuing message");
        messageQueue.push({
            content,
            receiverId: currentChatUser._id,
            localId,
            timestamp
        });
    }

    try {
        const res = await fetch('https://chat-app-backend-vf79.onrender.com/api/chat/send', {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({
                receiverId: currentChatUser._id,
                content
            })
        });

        const data = await res.json(); // <- must return message _id
        const messageId = data._id;
        const statusEl = document.querySelector(`.message-status[data-id="${localId}"]`);
        if (statusEl) {
            statusEl.dataset.id = messageId
            statusEl.className = "message-status status-sent"
            statusEl.textContent = '✅';
        }
        input.value = '';

    } catch (err) {
        console.error('Failed to send message:', err);
    }
};

window.addEventListener('online', async () => {
    if (pendingQueue.length > 0) {
        console.log("Retrying pending messages...");

        const queueCopy = [...pendingQueue];
        pendingQueue.length = 0;

        for (const msg of queueCopy) {
            try {
                const res = await fetch('https://chat-app-backend-vf79.onrender.com/api/chat/send', {
                    method: 'POST',
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        receiverId: msg.receiverId,
                        content: msg.content
                    })
                });

                const data = await res.json();
                const realId = data._id;

                const statusEl = document.querySelector(`.message-status[data-id="${msg.tempId}"]`);
                if (statusEl) {
                    statusEl.dataset.id = realId;
                    statusEl.className = 'message-status status-sent';
                    statusEl.textContent = '✅';
                }

            } catch (err) {
                console.error('Retry failed, re-queuing...', err);
                pendingQueue.push(msg);
            }
        }
    }
});


// ✅ Load Friend Requests
async function loadFriendRequests() {
    try {
        const res = await fetch('https://chat-app-backend-vf79.onrender.com/api/friends/requests', {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        const requests = await res.json();
        const container = document.getElementById('friendRequests');
        container.innerHTML = '<h4>Friend Requests</h4>';

        requests.forEach(req => {
            const item = document.createElement('div');
            item.className = 'request-item';
            item.innerHTML = `
                ${req.username}
                <button onclick="acceptRequest('${req._id}')">Accept</button>
            `;
            container.appendChild(item);
        });

    } catch (err) {
        console.error('Could not fetch friend requests:', err);
    }
}

// ✅ Accept Request
async function acceptRequest(id) {
    try {
        await fetch(`https://chat-app-backend-vf79.onrender.com/api/friends/accept/${id}`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`
            }
        });
        loadFriends();
        loadFriendRequests();
    } catch (err) {
        console.error('Error accepting request:', err);
    }
}

// ✅ Init
window.onload = () => {
    loadFriends();
    loadFriendRequests();
    if (Notification.permission !== "granted") {
        Notification.requestPermission().then(permission => {
            console.log("Notification permission:", permission);
        });
    }

    chatMessages.addEventListener('scroll', () => {
        if (chatMessages.scrollTop === 0 && !allMessageLoaded) {
            loadMessages(true); // Load older messages
        }
    });
    const chatarea = document.querySelector('.chat-area');
    const nochat = document.querySelector('.no-chat');

    if (!currentChatUser) {
        nochat.classList.remove('hidden');
        chatarea.classList.add('hidden');
        nochat.innerHTML = `
      <div class="no-chat-selected">
        <i class='bx bx-message-bubble-plus'></i>
        <p>Select a friend to start chatting!</p>
      </div>`;
    } else {
        nochat.classList.add('hidden');
        chatarea.classList.remove('hidden');
    }
};

// ✅ Logout
function logout() {
    sessionStorage.removeItem("token");
    window.location.href = "../index.html";
}

function openModal1(friend) {
    document.getElementById('chatInfoModal').classList.remove('hidden');

    // Check if the friend is muted from sessionStorage
    const mutedUsers = JSON.parse(localStorage.getItem("mutedUsers") || "{}");
    // console.log("Muted check:", mutedUsers[senderId]);

    const isMuted = mutedUsers[friend._id] === true;

    // Render HTML with an ID for the button so we can bind event later
    document.getElementById('overview').innerHTML = `
        <div style="display: flex; align-items: center; gap: 15px;">
            <img src="${friend.profileImage || defaultImage}"
                 style="width: 60px; height: 60px; border-radius: 50%;">
            <div>
                <h2 style="margin: 0;">${friend.username}</h2>
                <p style="margin: 0;">${friend.bio}</p>
                <p style="margin: 0;">Joined: ${new Date(friend.createdAt).toLocaleDateString()}</p>
            </div>
        </div>
        <div style="margin-top: 15px;">
            <strong>Mute Notifications:</strong>
            <button id="muteBtn" style="margin-left: 10px;">${isMuted ? "Unmute" : "Mute"}</button>
        </div>
    `;

    // Delay binding the button to make sure it's in the DOM
    setTimeout(() => {
        const muteBtn = document.getElementById("muteBtn");
        if (muteBtn) {
            muteBtn.addEventListener("click", () => {
                // Toggle mute state
                mutedUsers[friend._id] = !mutedUsers[friend._id];
                localStorage.setItem("mutedUsers", JSON.stringify(mutedUsers));

                // Update button text
                muteBtn.textContent = mutedUsers[friend._id] ? "Unmute" : "Mute";

                // Optionally: show toast or alert
                alert(`${friend.username} is now ${mutedUsers[friend._id] ? "muted" : "unmuted"}`);
            });
        }
    }, 0);

    showTab('overview');
}


function showNotification(messageContent, senderId) {
    const mutedUsers = JSON.parse(localStorage.getItem("mutedUsers") || "{}");
    console.log(senderId)

    // 🚫 Exit if muted or notification permission denied
    if (Notification.permission !== "granted" || mutedUsers[senderId]) {
        return;
    }
    // 🔄 Get user data
    fetch(`https://chat-app-backend-vf79.onrender.com/api/user/${senderId}`, {
        headers: { Authorization: `Bearer ${token}` }
    }).then(res => {
        console.log(res.status)
        if (!res.ok) throw new Error("Failed to fetch user info");
        return res.json(); // <-- MUST return this
    }).then(user => {
        console.log("card will be called with", user);
        showNotificationCard(user, messageContent);
    }).catch(err => console.error("Notification error:", err));

}

function showNotificationCard(user, content) {
    const existingCard = document.querySelector(`.neumorphic-popup[data-user='${user._id}']`);

    const uniqueInputId = `replyInput-${user._id}`;

    if (existingCard) {
        const userInfo = existingCard.querySelector('.user-info');
        if (userInfo) {
            userInfo.querySelector('p').textContent = content;
        }

        playSound();
        existingCard.classList.add('highlight');
        setTimeout(() => existingCard.classList.remove('highlight'), 500);

        resetAutoClose(existingCard); // reset auto-close when updated
        return;
    }

    const card = document.createElement('div');
    card.classList.add('neumorphic-popup');
    card.setAttribute('data-user', user._id);
    card.setAttribute('tabindex', '0'); // Make it focusable

    card.innerHTML = `
        <div class="popup-close" onclick="this.parentElement.remove()">×</div>
        <div class="popup-header">
            <img src="${user.profileImage || defaultImage}" />
            <div class="user-info">
                <h4>${user.username}</h4>
                <p>${content}</p>
            </div>
        </div>
        <div class="popup-footer">
            <input type="text" id="${uniqueInputId}" placeholder="Reply...">
            <button onclick="sendReply('${user._id}', '${uniqueInputId}')"><i class='bx  bx-send' ></i></button>
        </div>
        <div class="popup-preview" style="margin-top: 8px; font-size: 0.85rem; color: #444;"></div>
    `;

    const container = document.getElementById('notificationContainer');
    container.appendChild(card);

    // Typing Detection
    const input = document.getElementById(uniqueInputId)
    if (input) {
        let typingTimeout;
        input.addEventListener('input', () => {
            socket.emit('typing', {
                to: user._id,
                from: loggedInUser
            });

            clearTimeout(typingTimeout)
            typingTimeout = setTimeout(() => {

            }, 1000)
        })
    }
    // 🔕 Auto close if user doesn’t interact
    let autoCloseTimeout = setTimeout(() => {
        if (document.activeElement !== input) {
            card.remove();
        }
    }, 5000);

    input?.addEventListener('focus', () => clearTimeout(autoCloseTimeout));
    input?.addEventListener('blur', () => {
        autoCloseTimeout = setTimeout(() => {
            card.remove();
        }, 3000);
    });
    playSound();

    // Track focus to prevent premature closing
    card.addEventListener('mouseenter', () => clearTimeout(card.autoCloseTimer));
    card.addEventListener('mouseleave', () => startAutoClose(card));

    card.addEventListener('focusin', () => clearTimeout(card.autoCloseTimer));
    card.addEventListener('focusout', () => startAutoClose(card));

    startAutoClose(card); // start initial auto-close
}

function startAutoClose(card, delay = 5000) {
    card.autoCloseTimer = setTimeout(() => {
        if (document.activeElement !== card && !card.contains(document.activeElement)) {
            card.remove();
        }
    }, delay);
}

function resetAutoClose(card) {
    clearTimeout(card.autoCloseTimer);
    startAutoClose(card);
}

function playSound() {
    const sound = document.getElementById('notifysound');
    if (sound) sound.play().catch(() => { });
}

async function sendReply(receiverId, inputId) {
    const replyInput = document.getElementById(inputId);
    const reply = replyInput.value.trim();

    if (!reply || !receiverId) return;

    try {
        const res = await fetch(`https://chat-app-backend-vf79.onrender.com/api/chat/send`, {
            method: 'POST',
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({
                receiverId,
                content: reply
            })
        });

        if (!res.ok) {
            alert("Failed to send message.");
            return;
        }

        // Show reply preview
        const card = document.querySelector(`.neumorphic-popup[data-user='${receiverId}']`);
        if (card) {
            const Replypreview = card.querySelector('.user-info');
            if (Replypreview) {
                Replypreview.querySelector('p').innerHTML = `You : ${reply}`;
            }
        }

        // Clear input and keep card open for more replies
        replyInput.value = '';
        const button = replyInput.nextElementSibling;
        button.textContent = "✅ Sent";
        button.disabled = true;

        setTimeout(() => {
            button.textContent = `<i class='bx  bx-send' ></i>`;
            button.disabled = false;
        }, 1500);

        setTimeout(() => {
            const card = document.querySelector(`.neumorphic-popup[data-user='${receiverId}']`);
            if (card) card.remove();
        }, 1500);

    } catch (err) {
        console.error('Error sending message:', err);
    }
}


function closeModalm() {
    document.getElementById('chatInfoModal').classList.add('hidden')
}

function showTab(tabId) {
    document.querySelectorAll('.tab').forEach(t => t.classList.add('hidden'));
    document.getElementById(tabId).classList.remove('hidden');
}
// Slim Sidebar Toggle for Friends and Requests
const showFriendsBtn = document.getElementById('showFriends');
const showRequestsBtn = document.getElementById('showRequests');
const friendsList = document.getElementById('friendsList');
const friendRequests = document.getElementById('friendRequests');

showFriendsBtn.addEventListener('click', () => {
    // Toggle views
    friendsList.style.display = 'block';
    friendRequests.style.display = 'none';

    // Highlight icon
    showFriendsBtn.classList.add('active-icon');
    showRequestsBtn.classList.remove('active-icon');
});

showRequestsBtn.addEventListener('click', () => {
    // Toggle views
    friendsList.style.display = 'none';
    friendRequests.style.display = 'block';

    // Highlight icon
    showRequestsBtn.classList.add('active-icon');
    showFriendsBtn.classList.remove('active-icon');
});

// Optional: default state on load
window.addEventListener('DOMContentLoaded', () => {
    showFriendsBtn.click();
});

async function selectFriend(friend) {
    currentChatUser = friend;

    // Mobile responsive behavior
    const chatArea = document.querySelector('.chat-area');
    const chatInput = document.querySelector('.chat-input');
    const mainSidebar = document.querySelector('.main-sidebar');
    const nochat = document.querySelector('.no-chat');

    const backButtonHTML = `
    <span class="back-button" onclick="goBackToFriends()" style="font-size: 25px; margin-right: 10px; cursor:pointer;"><i class='bx  bx-chevron-left-circle'></i></span>
  `;

    nochat.classList.add('hidden');
    chatArea.classList.remove('hidden');
    if (window.innerWidth <= 768) {
        chatArea.classList.add('show-on-mobile');
        chatInput.classList.add('show-on-mobile');
        mainSidebar.classList.add('hide-on-mobile');
    }

    // Reset counters for infinite scroll
    skipCount = 0;
    allMessageLoaded = false;

    // Reset unread count
    unreadMap.delete(friend._id);
    highlightUnreadInFriendList();
    clearInterval(unreadTitleInterval);
    unreadTitleInterval = null;
    document.title = originalTitle;

    // Set chat header
    chatHeader.innerHTML = `
    ${window.innerWidth <= 768 ? backButtonHTML : ''}
    <div id="chatHeaderDetails" style="cursor:pointer; display: inline-flex; align-items: center;">
      <img src="${friend.profileImage || defaultImage}" alt="profile" style="width: 40px; height: 40px; border-radius: 50%; margin-right: 10px;">
      <span>${friend.username}</span>
    </div>
  `;

    // Click to open user info modal
    document.getElementById('chatHeaderDetails').addEventListener('click', () => {
        openModal1(friend);
    });

    // Set user data and load messages
    const chatBox = document.getElementById('chatMessages');
    chatBox.setAttribute('data-user', friend._id);
    chatBox.innerHTML = '';

    await loadMessages();

    socket.emit('message-seen', {
        userId: loggedInUser,
        fromId: currentChatUser._id
    });
}

function goBackToFriends() {
    document.querySelector('.chat-area').classList.remove('show-on-mobile');
    document.querySelector('.chat-input').classList.remove('show-on-mobile');
    document.querySelector('.main-sidebar').classList.remove('hide-on-mobile');
}

window.addEventListener('focus', () => {
    if (currentChatUser) {
        socket.emit('message-seen', {
            userId: loggedInUser,
            fromId: currentChatUser._id
        });
    }
});
