const searchInp = document.getElementById("searchInput");
const searchResults = document.getElementById('searchResults');
const profileCard = document.getElementById('profileCard');
const friendslist = document.getElementById('friendsList');
const friendReq = document.getElementById('friendRequests');
const searchLoader = document.getElementById("searchLoader");
let currentSidebarView = 'friends'; // default view

// Button toggles
document.getElementById('showFriends').addEventListener('click', () => {
    currentSidebarView = 'friends';
    if (!searchInp.value.trim()) {
        searchResults.innerHTML = '';
        friendslist.style.display = 'block';
        friendReq.style.display = 'none';
    }
});

document.getElementById('showRequests').addEventListener('click', () => {
    currentSidebarView = 'requests';
    if (!searchInp.value.trim()) {
        searchResults.innerHTML = '';
        friendReq.style.display = 'block';
        friendslist.style.display = 'none';
    }
});


const defImg = "https://img.freepik.com/free-vector/blue-circle-with-white-user_78370-4707.jpg";

const createUserCard = (user) => {
    const card = document.createElement("div");
    card.classList.add("search-item");

    const profileImg = document.createElement("img");
    if (user.profileImage) {
        profileImg.src = `${user.profileImage}`
    } else {
        profileImg.src = `${defImg}`; // fallback
    }
    profileImg.alt = `${user.username}'s profile picture`;
    profileImg.style.width = "40px";
    profileImg.style.height = "40px";
    profileImg.style.borderRadius = "50%";
    profileImg.style.marginRight = "10px";

    const nameSpan = document.createElement("span");
    nameSpan.textContent = user.username;

    card.appendChild(profileImg);
    card.appendChild(nameSpan);

    return card;
};
searchInp.addEventListener('input', async () => {
    const query = searchInp.value.trim();

    // Show search results only if at least 2 characters typed
    if (query.length >= 2) {
        searchResults.style.display = 'block';
        friendslist.style.display = 'none';
        friendReq.style.display = 'none';
        profileCard.classList.add('hidden');
        searchResults.classList.add('fade')
        searchLoader.classList.remove('hidden')
        // Show loader
        searchResults.innerHTML = `<div id="searchLoader">Searching...</div>`;
        try {
            const res = await fetch(`https://chat-app-backend-vf79.onrender.com/api/search/search?username=${query}`, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            if (!res.ok) {
                throw new Error(`HTTP error ${res.status}`);
            }
            const users = await res.json()

            searchResults.innerHTML = ''
            searchLoader.classList.add('hidden')
            searchResults.classList.add('fade')

            if (users.length === 0) {
                searchResults.innerHTML = `<div class="no-results">No users found</div>`;
                return;
            }

            users.forEach(user => {
                const div = createUserCard(user)
                div.onclick = () => {
                    showUserProfile(user)
                }
                searchResults.appendChild(div)
            });
        } catch (err) {
            console.error('Search Error:', err)
            searchLoader.classList.add('hidden');
            searchResults.innerHTML = `<p style="color:red;">Error fetching results</p>`;
        }
    } else {
        // Hide searchResults and restore previously selected view
        searchResults.innerHTML = '';
        searchResults.style.display = 'none';
        profileCard.classList.add('hidden');

        if (currentSidebarView === 'friends') {
            friendslist.style.display = 'block';
            friendReq.style.display = 'none';
        } else {
            friendReq.style.display = 'block';
            friendslist.style.display = 'none';
        }
    }
});

async function showUserProfile(user) {
    // Clear Previous
    profileCard.innerHTML = '';
    profileCard.classList.remove('hidden')

    // check if already friend
    const res = await fetch('https://chat-app-backend-vf79.onrender.com/api/friends/friends', {
        headers: { Authorization: `Bearer ${token}` }
    });

    const friends = await res.json()
    const isFriend = friends.some(friend => friend._id === user._id)
    profileCard.innerHTML = `
    <img src="${user.profileImage || defImg}" alt="not found" style="width: 40px; height: 40px; border-radius: 50%; margin-right: 10px;">
    <h4>${user.username}</h4>
    <p>${user.email}</p>
`;

    const actionBtn = document.createElement('button');
    actionBtn.textContent = isFriend ? 'Chat Now' : 'Send Friend Request';
    actionBtn.addEventListener('click', () => {
        if (isFriend) {
            startChat(user._id, user.username, user.profileImage);
        } else {
            sendRequest(user._id);
        }
    });

    profileCard.appendChild(actionBtn);

}

function sendRequest(id) {
    fetch(`https://chat-app-backend-vf79.onrender.com/api/friends/request/${id}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
    })
        .then(res => res.json())
        .then(data => alert(data.message))
        .catch(err => console.error('Request error:', err));
}

function startChat(id, username, profileImage) {
    const dummyFriend = { _id: id, username, profileImage };
    selectFriend(dummyFriend);
}